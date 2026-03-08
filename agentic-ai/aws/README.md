# Agentic AI on AWS (ECS Fargate)

This CloudFormation template provisions an ECS Fargate task + service that runs the Agentic AI orchestrator. Use it with the same VPC/Subnets/Security Groups created for the main EstateWise stack.

## Parameters

| Parameter | Description |
|-----------|-------------|
| `EnvironmentName` | Prefix for resources (default `estatewise`). |
| `ClusterName` | Existing ECS cluster name. |
| `ExecutionRoleArn` | Task execution role (reuse the role from the backend stack). |
| `ContainerImage` | Agentic AI container image (e.g., `ghcr.io/your-org/estatewise-agentic:latest`). |
| `SubnetIds` | Private subnet IDs for the service (comma-separated). |
| `SecurityGroupIds` | Security groups allowing outbound traffic to APIs. |
| `GoogleApiKeySecretArn` / `OpenAiKeySecretArn` / `PineconeKeySecretArn` | Secrets Manager ARNs containing respective keys (optional). |
| `LangSmithKeySecretArn` | Secrets Manager ARN containing `LANGSMITH_API_KEY` (optional). |
| `LangSmithProject` / `LangSmithEndpoint` / `LangSmithEnabled` | LangSmith observability settings. |
| `PineconeIndex` | Pinecone index name. |
| `Neo4jUri`, `Neo4jUser`, `Neo4jPasswordSecretArn` | Neo4j connection info (optional). |
| `RuntimeSelector` | `default`, `langgraph`, or `crewai`. |

## Deploy

```bash
aws cloudformation deploy \
  --template-file agentic-ai/aws/ecs-service.yaml \
  --stack-name estatewise-agentic-ai \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ClusterName=estatewise-ecs-cluster \
    ExecutionRoleArn=arn:aws:iam::123:role/estatewise-ecs-execution-role \
    ContainerImage=ghcr.io/your-org/estatewise-agentic:latest \
    SubnetIds=subnet-aaa,subnet-bbb \
    SecurityGroupIds=sg-abc123 \
    GoogleApiKeySecretArn=arn:aws:secretsmanager:...:secret:google \
    PineconeKeySecretArn=arn:aws:secretsmanager:...:secret:pinecone \
    LangSmithKeySecretArn=arn:aws:secretsmanager:...:secret:langsmith \
    LangSmithProject=estatewise-agentic-ai \
    LangSmithEnabled=true
```

Logs stream to `/aws/ecs/<env>/agentic-ai`. Use `aws logs tail` to inspect execution output. Update `DesiredCount` parameter to scale horizontally.
