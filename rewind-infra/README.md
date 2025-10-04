# Rift Rewind Infrastructure

AWS CDK infrastructure for the Rift Rewind project. This stack manages AWS Amplify hosting for the `rewind-ui` Next.js application.

## Prerequisites

- **Node.js & npm** installed
- **AWS CLI** configured with credentials (use profile `rift-rewind`)
- **AWS CDK** installed globally: `npm install -g aws-cdk`
- **Existing Amplify App** with GitHub connection

## Environment Variables

Required environment variables:

- `AMPLIFY_APP_ID` - Your existing Amplify app ID
- `ENVIRONMENT` - Deployment environment (`dev` or `prod`). Defaults to `dev` if not set
- `AWS_PROFILE` - AWS profile to use (set to `rift-rewind`)

## Quick Start

### 1. Set up AWS Profile

```bash
export AWS_PROFILE=rift-rewind
```

### 2. Bootstrap CDK (first time only)

```bash
npm run build
npx cdk bootstrap
```

### 3. Deploy

```bash
# Development deployment
export AMPLIFY_APP_ID=your-app-id
export ENVIRONMENT=dev
npx cdk deploy

# Production deployment
export AMPLIFY_APP_ID=your-app-id
export ENVIRONMENT=prod
npx cdk deploy
```

## What This Stack Does

This CDK stack manages:

### AWS Amplify Hosting
- Creates/updates the `main` branch configuration for your Amplify app
- Configures build settings optimized for Next.js with SSR
- Sets up monorepo support for the `rewind-ui` directory
- Enables automatic builds on Git push
- Configures deployment stage (DEVELOPMENT or PRODUCTION)

### Build Configuration
The stack reads from `amplify.yml` which defines:
- App root: `rewind-ui`
- Package manager: yarn
- Build artifacts: `.next` directory
- Node modules caching for faster builds

## Project Structure

```
rewind-infra/
├── bin/
│   └── rewind-infra.ts       # CDK app entry point
├── lib/
│   └── rewind-infra-stack.ts # Stack definition
├── amplify.yml                # Amplify build specification
├── cdk.json                   # CDK configuration
└── README.md                  # This file
```

## Stack Resources

- **Amplify Branch** (`AWS::Amplify::Branch`): Manages the main branch configuration
  - Auto-build enabled
  - Framework: Next.js - SSR
  - Stage: DEVELOPMENT or PRODUCTION

## CDK Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run Jest unit tests
- `npx cdk deploy` - Deploy to AWS
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Emit CloudFormation template
- `npx cdk destroy` - Remove the stack from AWS

## Outputs

After deployment, the stack outputs:

- `rift-rewind-amplify-app-id` - Your Amplify App ID
- `rift-rewind-branch-name` - The branch name (main)
- `rift-rewind-branch-url` - Public URL of your deployed app

## Customization

### Modifying Build Configuration

Edit `amplify.yml` and redeploy:

```yaml
version: 1
applications:
  - appRoot: rewind-ui
    frontend:
      phases:
        preBuild:
          commands:
            - yarn install
        build:
          commands:
            - yarn build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

### Adding New Resources

Add new setup methods in `rewind-infra-stack.ts`:

```typescript
export class RewindInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.setupAmplify();
    // Add more resources here
    // this.setupDatabase();
    // this.setupApi();
  }

  private setupAmplify(): void {
    // Amplify configuration
  }
}
```

## Troubleshooting

### Authentication Issues

Ensure your AWS profile is set:
```bash
aws sts get-caller-identity --profile rift-rewind
```

### Build Failures

1. Check Amplify Console build logs
2. Verify `amplify.yml` syntax
3. Ensure `rewind-ui/package.json` has correct scripts
4. Check that all dependencies are listed

### Environment Not Set

If you see "ENVIRONMENT is not set, defaulting to `dev`", either:
- Export the variable: `export ENVIRONMENT=prod`
- Or let it default to `dev`

## Deployment Notes

- **First Deploy**: The branch will be created fresh
- **Subsequent Deploys**: Only configuration changes are applied
- **Branch Deletion**: Run `npx cdk destroy` to remove CDK management (branch remains in Amplify)
- **GitHub Connection**: Uses the existing GitHub App connection in your Amplify app

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Next.js on Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html)
