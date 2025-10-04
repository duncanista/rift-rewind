import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

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

    // Future resources can be added here
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
}