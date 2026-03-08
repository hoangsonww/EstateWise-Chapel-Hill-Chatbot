param location string = resourceGroup().location
param environmentName string = 'estatewise'
param containerImage string
param registryServer string
param registryIdentity string = 'system'
param googleAiApiKey string = ''
param openAiApiKey string = ''
param pineconeApiKey string = ''
param langsmithApiKey string = ''
param langsmithEnabled string = 'false'
param langsmithProject string = 'estatewise-agentic-ai'
param langsmithEndpoint string = ''
param pineconeIndex string = 'estatewise-index'
param neo4jUri string = ''
param neo4jUser string = ''
param neo4jPassword string = ''
param agentRuntime string = 'langgraph'
param minReplicas int = 1
param maxReplicas int = 2
param logAnalyticsWorkspaceId string
param logAnalyticsCustomerId string
param logAnalyticsSharedKey string

resource env 'Microsoft.App/managedEnvironments@2023-05-01' existing = {
  name: '${environmentName}-aca-env'
}

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-agentic-ai'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3001
      }
      registries: [
        {
          server: registryServer
          identity: registryIdentity
        }
      ]
      secrets: [
        if (googleAiApiKey != '') {
          name: 'google-ai-api-key'
          value: googleAiApiKey
        }
        if (openAiApiKey != '') {
          name: 'openai-api-key'
          value: openAiApiKey
        }
        if (pineconeApiKey != '') {
          name: 'pinecone-api-key'
          value: pineconeApiKey
        }
        if (langsmithApiKey != '') {
          name: 'langsmith-api-key'
          value: langsmithApiKey
        }
        if (neo4jPassword != '') {
          name: 'neo4j-password'
          value: neo4jPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'agentic-ai'
          image: containerImage
          env: [
            {
              name: 'AGENT_RUNTIME'
              value: agentRuntime
            }
            {
              name: 'LANGSMITH_ENABLED'
              value: langsmithEnabled
            }
            {
              name: 'LANGSMITH_PROJECT'
              value: langsmithProject
            }
            if (langsmithEndpoint != '') {
              name: 'LANGSMITH_ENDPOINT'
              value: langsmithEndpoint
            }
            if (pineconeIndex != '') {
              name: 'PINECONE_INDEX'
              value: pineconeIndex
            }
            if (neo4jUri != '') {
              name: 'NEO4J_URI'
              value: neo4jUri
            }
            if (neo4jUser != '') {
              name: 'NEO4J_USERNAME'
              value: neo4jUser
            }
            if (googleAiApiKey != '') {
              name: 'GOOGLE_AI_API_KEY'
              secretRef: 'google-ai-api-key'
            }
            if (openAiApiKey != '') {
              name: 'OPENAI_API_KEY'
              secretRef: 'openai-api-key'
            }
            if (pineconeApiKey != '') {
              name: 'PINECONE_API_KEY'
              secretRef: 'pinecone-api-key'
            }
            if (langsmithApiKey != '') {
              name: 'LANGSMITH_API_KEY'
              secretRef: 'langsmith-api-key'
            }
            if (neo4jPassword != '') {
              name: 'NEO4J_PASSWORD'
              secretRef: 'neo4j-password'
            }
          ]
          resources: {
            cpu: 1
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: []
      }
    }
  }
}

resource monitor 'Microsoft.App/managedEnvironments/diagnostics@2023-05-01' = {
  name: '${env.name}/default'
  properties: {
    storageAccountConfiguration: null
    logAnalyticsConfiguration: {
      customerId: logAnalyticsCustomerId
      sharedKey: logAnalyticsSharedKey
    }
  }
}

output containerAppName string = app.name
output principalId string = app.identity.principalId
