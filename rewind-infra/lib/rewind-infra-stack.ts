import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

const prefix = 'rift-rewind';

let environment = process.env.ENVIRONMENT;
if (!process.env.ENVIRONMENT) {
  console.log('ENVIRONMENT is not set, defaulting to `dev`');
  environment = 'dev';
}

export class RewindInfraStack extends cdk.Stack {
  private riotApiKeySecret: secretsmanager.Secret;
  private dataBucket: s3.Bucket;
  private userInsightsTable: dynamodb.Table;
  private matchIndexTable: dynamodb.Table;
  private userProcessingQueue: sqs.Queue;
  private matchProcessingQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Set up Amplify hosting
    this.setupAmplify();

    // Set up Secrets Manager
    this.setupSecretsManager();

    // Set up S3 bucket for match data
    this.setupS3Bucket();

    // Set up DynamoDB tables
    this.setupDynamoDB();

    // Set up SQS queue
    this.setupSQS();

    // Set up Lambda functions
    this.setupLambdas();
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

  private setupSecretsManager(): void {
    // Get Riot API key from environment variable
    const riotApiKey = process.env.RIOT_API_KEY;
    if (!riotApiKey) {
      throw new Error('RIOT_API_KEY environment variable is not set');
    }

    // Create Secrets Manager secret for Riot API key
    this.riotApiKeySecret = new secretsmanager.Secret(this, `${prefix}-riot-api-key-${environment}`, {
      secretName: `${prefix}/riot-api-key/${environment}`,
      description: 'Riot API key for fetching League of Legends match data',
      secretStringValue: cdk.SecretValue.unsafePlainText(riotApiKey),
    });

    new cdk.CfnOutput(this, `${prefix}-secret-arn`, {
      value: this.riotApiKeySecret.secretArn,
      description: 'Riot API Key Secret ARN',
    });
  }

  private setupS3Bucket(): void {
    // Create S3 bucket for storing match data and user aggregations
    this.dataBucket = new s3.Bucket(this, `${prefix}-data-bucket-${environment}`, {
      bucketName: `${prefix}-data-${environment}-${this.account}`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    new cdk.CfnOutput(this, `${prefix}-data-bucket-name`, {
      value: this.dataBucket.bucketName,
      description: 'S3 Bucket Name for Match Data',
    });
  }

  private setupDynamoDB(): void {
    // Table for user insights and aggregated data
    this.userInsightsTable = new dynamodb.Table(this, `${prefix}-user-insights-${environment}`, {
      tableName: `${prefix}-user-insights-${environment}`,
      partitionKey: { name: 'puuid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Add GSI for looking up PUUID by summoner name
    // This allows us to cache summoner name -> PUUID mappings
    this.userInsightsTable.addGlobalSecondaryIndex({
      indexName: 'summoner-lookup-index',
      partitionKey: { name: 'summoner_key', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY, // Only need the PUUID
    });

    // Table for match index (quick lookup of participants)
    this.matchIndexTable = new dynamodb.Table(this, `${prefix}-match-index-${environment}`, {
      tableName: `${prefix}-match-index-${environment}`,
      partitionKey: { name: 'match_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Add GSI for querying matches by date (optional, for future use)
    this.matchIndexTable.addGlobalSecondaryIndex({
      indexName: 'gameCreation-index',
      partitionKey: { name: 'platform_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'game_creation', type: dynamodb.AttributeType.NUMBER },
    });

    new cdk.CfnOutput(this, `${prefix}-user-insights-table-name`, {
      value: this.userInsightsTable.tableName,
      description: 'DynamoDB User Insights Table Name',
    });

    new cdk.CfnOutput(this, `${prefix}-match-index-table-name`, {
      value: this.matchIndexTable.tableName,
      description: 'DynamoDB Match Index Table Name',
    });
  }

  private setupSQS(): void {
    // Create SQS queue for user processing
    this.userProcessingQueue = new sqs.Queue(this, `${prefix}-user-processing-queue-${environment}`, {
      queueName: `${prefix}-user-processing-${environment}`,
      visibilityTimeout: cdk.Duration.minutes(15), // Match Lambda timeout
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, `${prefix}-user-processing-dlq-${environment}`, {
          queueName: `${prefix}-user-processing-dlq-${environment}`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // Create SQS queue for individual match processing
    this.matchProcessingQueue = new sqs.Queue(this, `${prefix}-match-processing-queue-${environment}`, {
      queueName: `${prefix}-match-processing-${environment}`,
      visibilityTimeout: cdk.Duration.minutes(6), // Must be >= Lambda timeout (5 min) + buffer
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Enable long polling to reduce empty receives
      deadLetterQueue: {
        queue: new sqs.Queue(this, `${prefix}-match-processing-dlq-${environment}`, {
          queueName: `${prefix}-match-processing-dlq-${environment}`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 5, // Increase from 3 to 5 to allow more retries for rate limits
      },
    });

    new cdk.CfnOutput(this, `${prefix}-user-processing-queue-url`, {
      value: this.userProcessingQueue.queueUrl,
      description: 'SQS Queue URL for User Processing',
    });

    new cdk.CfnOutput(this, `${prefix}-match-processing-queue-url`, {
      value: this.matchProcessingQueue.queueUrl,
      description: 'SQS Queue URL for Match Processing',
    });
  }

  private setupLambdas(): void {
    const backendPath = path.join(__dirname, '..', '..', 'rewind-backend');
    const lambdaCode = lambda.Code.fromAsset(backendPath, {
      bundling: {
        image: lambda.Runtime.PYTHON_3_12.bundlingImage,
        command: [
          'bash', '-c',
          'cd lambdas && pip install -r requirements.txt -t /asset-output && cp -au . /asset-output && cp -au ../lib /asset-output && rm -rf /asset-output/tests && rm -rf /asset-output/README.md',
        ],
      },
    });

    // Lambda 1: Check User Status (or modified aggregator)
    // This Lambda checks if user data is processed and queues if needed
    const checkUserStatusLambda = new lambda.Function(this, `${prefix}-check-user-status-${environment}`, {
      functionName: `${prefix}-check-user-status-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'check_user_status.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        RIOT_API_KEY_SECRET_ARN: this.riotApiKeySecret.secretArn,
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        USER_INSIGHTS_TABLE_NAME: this.userInsightsTable.tableName,
        USER_PROCESSING_QUEUE_URL: this.userProcessingQueue.queueUrl,
        MATCH_PROCESSING_QUEUE_URL: this.matchProcessingQueue.queueUrl,
        ENVIRONMENT: environment!,
      },
      description: 'Checks if user data is processed and queues processing if needed',
    });

    // Grant permissions
    this.riotApiKeySecret.grantRead(checkUserStatusLambda);
    this.dataBucket.grantReadWrite(checkUserStatusLambda);
    this.userInsightsTable.grantReadWriteData(checkUserStatusLambda);
    this.userProcessingQueue.grantSendMessages(checkUserStatusLambda);

    // Create Lambda Function URL with CORS
    const allowedOrigins = environment === 'dev' 
      ? ['https://riftrewind.lol', 'https://www.riftrewind.lol', 'http://localhost:3000', 'http://localhost:3001']
      : ['https://riftrewind.lol', 'https://www.riftrewind.lol'];
    
    const checkUserStatusUrl = checkUserStatusLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Lambda 2: Process User Matches (SQS-triggered)
    // This Lambda processes all matches for a user and stores them in S3
    const processUserMatchesLambda = new lambda.Function(this, `${prefix}-process-user-matches-${environment}`, {
      functionName: `${prefix}-process-user-matches-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'process_user_matches.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.minutes(15), // Maximum Lambda timeout
      memorySize: 1024, // More memory for processing multiple matches
      environment: {
        RIOT_API_KEY_SECRET_ARN: this.riotApiKeySecret.secretArn,
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        USER_INSIGHTS_TABLE_NAME: this.userInsightsTable.tableName,
        MATCH_INDEX_TABLE_NAME: this.matchIndexTable.tableName,
        MATCH_PROCESSING_QUEUE_URL: this.matchProcessingQueue.queueUrl,
        ENVIRONMENT: environment!,
      },
      description: 'Processes all matches for a user and stores aggregated data',
    });

    // Grant permissions
    this.riotApiKeySecret.grantRead(processUserMatchesLambda);
    this.dataBucket.grantReadWrite(processUserMatchesLambda);
    this.userInsightsTable.grantReadWriteData(processUserMatchesLambda);
    this.matchIndexTable.grantReadWriteData(processUserMatchesLambda);
    this.matchProcessingQueue.grantSendMessages(processUserMatchesLambda);

    // Add SQS event source for user processing
    processUserMatchesLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.userProcessingQueue, {
        batchSize: 1, // Process one user at a time
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    // ===== BEDROCK AI INSIGHTS =====
    // Define generate insights Lambda first so it can be referenced
    const generateInsightsLambda = new lambda.Function(this, `${prefix}-generate-insights-${environment}`, {
      functionName: `${prefix}-generate-insights-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'generate_insights.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        USER_PROCESSING_QUEUE_URL: this.userProcessingQueue.queueUrl,
        ENVIRONMENT: environment!,
      },
      description: 'Generates AI insights using Bedrock Converse API',
    });

    // Grant permissions
    this.dataBucket.grantRead(generateInsightsLambda);
    this.userProcessingQueue.grantSendMessages(generateInsightsLambda);
    generateInsightsLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-pro-v1:0`,
        ],
      })
    );

    // Lambda 4: Aggregate User Matches
    // This Lambda aggregates all matches for a user when processing is complete
    const aggregateUserLambda = new lambda.Function(this, `${prefix}-aggregate-user-${environment}`, {
      functionName: `${prefix}-aggregate-user-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'aggregate_user.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024, // More memory for aggregating many matches
      environment: {
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        USER_INSIGHTS_TABLE_NAME: this.userInsightsTable.tableName,
        GENERATE_INSIGHTS_FUNCTION_NAME: generateInsightsLambda.functionName,
        ENVIRONMENT: environment!,
      },
      description: 'Aggregates all matches for a user when processing is complete',
    });

    // Grant permissions
    this.dataBucket.grantReadWrite(aggregateUserLambda);
    this.userInsightsTable.grantReadWriteData(aggregateUserLambda);
    generateInsightsLambda.grantInvoke(aggregateUserLambda);

    // Lambda 3: Process Individual Match (SQS-triggered)
    // This Lambda processes one match at a time
    const processMatchLambda = new lambda.Function(this, `${prefix}-process-match-${environment}`, {
      functionName: `${prefix}-process-match-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'process_match.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.minutes(5), // Processing one match is fast
      memorySize: 512,
      environment: {
        RIOT_API_KEY_SECRET_ARN: this.riotApiKeySecret.secretArn,
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        MATCH_INDEX_TABLE_NAME: this.matchIndexTable.tableName,
        USER_INSIGHTS_TABLE_NAME: this.userInsightsTable.tableName,
        AGGREGATE_USER_FUNCTION_NAME: aggregateUserLambda.functionName,
        ENVIRONMENT: environment!,
      },
      description: 'Processes a single match and stores data',
    });

    // Grant permissions
    this.riotApiKeySecret.grantRead(processMatchLambda);
    this.dataBucket.grantReadWrite(processMatchLambda);
    this.matchIndexTable.grantReadWriteData(processMatchLambda);
    this.userInsightsTable.grantReadWriteData(processMatchLambda);
    aggregateUserLambda.grantInvoke(processMatchLambda);

    // Add SQS event source for match processing with rate limiting
    // Riot API limits: 20 requests/second, 100 requests/2 minutes
    // maxConcurrency of 10 means max 10 concurrent Lambda executions
    processMatchLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.matchProcessingQueue, {
        batchSize: 1, // Process one match at a time
        maxBatchingWindow: cdk.Duration.seconds(5),
        maxConcurrency: 10, // Limit concurrent Lambda executions to respect rate limits
      })
    );

    new cdk.CfnOutput(this, `${prefix}-process-match-function-name`, {
      value: processMatchLambda.functionName,
      description: 'Process Match Lambda Function Name',
    });

    new cdk.CfnOutput(this, `${prefix}-aggregate-user-function-name`, {
      value: aggregateUserLambda.functionName,
      description: 'Aggregate User Lambda Function Name',
    });

    // Keep existing aggregator Lambda for backward compatibility (optional)
    // You can remove this if you want to fully migrate to the new architecture
    const aggregatorLambda = new lambda.Function(this, `${prefix}-aggregator-${environment}`, {
      functionName: `${prefix}-aggregator-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'aggregator.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        RIOT_API_KEY_SECRET_ARN: this.riotApiKeySecret.secretArn,
      },
      description: 'Legacy aggregator Lambda (for backward compatibility)',
    });

    this.riotApiKeySecret.grantRead(aggregatorLambda);

    const aggregatorUrl = aggregatorLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, `${prefix}-check-user-status-url`, {
      value: checkUserStatusUrl.url,
      description: 'Check User Status Lambda Function URL',
    });

    new cdk.CfnOutput(this, `${prefix}-check-user-status-function-name`, {
      value: checkUserStatusLambda.functionName,
      description: 'Check User Status Lambda Function Name',
    });

    new cdk.CfnOutput(this, `${prefix}-process-user-matches-function-name`, {
      value: processUserMatchesLambda.functionName,
      description: 'Process User Matches Lambda Function Name',
    });

    new cdk.CfnOutput(this, `${prefix}-aggregator-function-url`, {
      value: aggregatorUrl.url,
      description: 'Legacy Aggregator Lambda Function URL',
    });

    // Add Function URL for generate insights
    const generateInsightsUrl = generateInsightsLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Lambda: Chat Handler
    const chatLambda = new lambda.Function(this, `${prefix}-chat-${environment}`, {
      functionName: `${prefix}-chat-${environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'chat.handler.lambda_handler',
      code: lambdaCode,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DATA_BUCKET_NAME: this.dataBucket.bucketName,
        USER_PROCESSING_QUEUE_URL: this.userProcessingQueue.queueUrl,
        ENVIRONMENT: environment!,
      },
      description: 'Handles chat interactions using Bedrock Converse API',
    });

    // Grant permissions
    this.dataBucket.grantRead(chatLambda);
    this.userProcessingQueue.grantSendMessages(chatLambda);
    chatLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-pro-v1:0`,
        ],
      })
    );

    const chatUrl = chatLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, `${prefix}-generate-insights-url`, {
      value: generateInsightsUrl.url,
      description: 'Generate Insights Lambda Function URL',
    });

    new cdk.CfnOutput(this, `${prefix}-chat-url`, {
      value: chatUrl.url,
      description: 'Chat Lambda Function URL',
    });
  }
}