#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RewindInfraStack } from '../lib/rewind-infra-stack';

const environment = process.env.ENVIRONMENT || 'dev';
const region = process.env.REGION || 'us-east-1';

const app = new cdk.App();
new RewindInfraStack(app, `rewind-infra-${environment}`, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { region },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});