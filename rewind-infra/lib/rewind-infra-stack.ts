import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const prefix = 'rift-rewind';

let environment = process.env.ENVIRONMENT;
if (!process.env.ENVIRONMENT) {
  console.log('ENVIRONMENT is not set, defaulting to `dev`');
  environment = 'dev';
}

export class RewindInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set up Amplify hosting
    this.setupAmplify();

    // Create a new S3 bucket for the user data


    // Set up Lambda and Secrets Manager
    this.setupLambda();
  }

  private setupAmplify(): void {
    // Map environment to valid Amplify stage values
    const envToStage: { [key: string]: string } = {
      'prod': 'PRODUCTION',
      'dev': 'DEVELOPMENT',
    };

    // Read the amplify.yml file
    const buildSpec = fs.readFileSync(path.join(__dirname, '..', 'amplify.yml'), 'utf8');
    const stage = envToStage[environment!.toLowerCase()] || 'DEVELOPMENT';

    const AMPLIFY_APP_ID = process.env.AMPLIFY_APP_ID; // This is the existing Amplify app id

    if (!AMPLIFY_APP_ID) {
      throw new Error('AMPLIFY_APP_ID is not set');
    }


    // Create main branch with build configuration for rewind-ui
    const mainBranch = new cdk.aws_amplify.CfnBranch(this, `${prefix}-main-branch`, {
      appId: AMPLIFY_APP_ID,
      branchName: 'main',
      enableAutoBuild: true,
      stage,
      framework: 'Next.js - SSR',
      buildSpec,
    });

    // Outputs
    new cdk.CfnOutput(this, `${prefix}-amplify-app-id`, {
      value: AMPLIFY_APP_ID,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, `${prefix}-branch-name`, {
      value: mainBranch.branchName,
      description: 'Amplify Branch Name',
    });

    new cdk.CfnOutput(this, `${prefix}-branch-url`, {
      value: `https://${mainBranch.branchName}.${AMPLIFY_APP_ID}.amplifyapp.com`,
      description: 'Amplify Branch URL',
    });
  }

  private setupLambda(): void {
    // Get Riot API key from environment variable
    const riotApiKey = process.env.RIOT_API_KEY;
    if (!riotApiKey) {
      throw new Error('RIOT_API_KEY environment variable is not set');
    }

    // Create S3 bucket for caching match data and aggregate results
    const storageBucket = new s3.Bucket(this, `${prefix}-storage-${environment}`, {
      bucketName: `${prefix}-storage-${environment}`,
      // No lifecycle rules - keep data forever
      versioned: false,
      // Automatically delete objects when bucket is destroyed (for dev environment)
      removalPolicy: environment === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: environment === 'dev',
    });

    // Create Secrets Manager secret for Riot API key
    const riotApiKeySecret = new secretsmanager.Secret(this, `${prefix}-riot-api-key-${environment}`, {
      secretName: `${prefix}/riot-api-key/${environment}`,
      description: 'Riot API key for fetching League of Legends match data',
      secretStringValue: cdk.SecretValue.unsafePlainText(riotApiKey),
    });

    // Create Lambda function for match data aggregation
    // Bundle Python dependencies with the Lambda code
    const backendPath = path.join(__dirname, '..', '..', 'rewind-backend');
    const aggregatorLambda = new lambda.Function(this, `${prefix}-aggregator-${environment}`, {
      functionName: `${prefix}-aggregator-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'aggregator.handler.lambda_handler',
      code: lambda.Code.fromAsset(backendPath, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          command: [
            'bash', '-c',
            'cd lambdas && pip install -r requirements.txt -t /asset-output && cp -au . /asset-output && cp -au ../lib /asset-output',
            // Remove unused files
            'rm -rf /asset-output/tests/*',
            'rm -rf /asset-output/README.md',
          ],
        },
      }),
      timeout: cdk.Duration.seconds(60), // Increased timeout for S3 operations
      memorySize: 1024, // Increased memory for better performance
      environment: {
        RIOT_API_KEY_SECRET_ARN: riotApiKeySecret.secretArn,
        STORAGE_BUCKET_NAME: storageBucket.bucketName,
      },
      description: 'Single lambda that fetches, caches, and aggregates League of Legends match data',
    });

    // Grant Lambda permission to read the secret
    riotApiKeySecret.grantRead(aggregatorLambda);

    // Grant Lambda permission to read/write to S3 bucket
    storageBucket.grantReadWrite(aggregatorLambda);

    // Create Lambda Function URL with CORS
    // Include localhost for development/testing
    const allowedOrigins = environment === 'dev' 
      ? ['https://riftrewind.lol', 'https://www.riftrewind.lol', 'http://localhost:3000', 'http://localhost:3001']
      : ['https://riftrewind.lol', 'https://www.riftrewind.lol'];
    
    const functionUrl = aggregatorLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, `${prefix}-lambda-function-name`, {
      value: aggregatorLambda.functionName,
      description: 'Aggregator Lambda Function Name',
    });

    new cdk.CfnOutput(this, `${prefix}-lambda-function-url`, {
      value: functionUrl.url,
      description: 'Aggregator Lambda Function URL',
    });

    new cdk.CfnOutput(this, `${prefix}-secret-arn`, {
      value: riotApiKeySecret.secretArn,
      description: 'Riot API Key Secret ARN',
    });

    new cdk.CfnOutput(this, `${prefix}-storage-bucket-name`, {
      value: storageBucket.bucketName,
      description: 'S3 Storage Bucket Name',
    });
  }

}
