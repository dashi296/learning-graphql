const express = require('express')
// PubSubを読み込み
const { ApolloServer, PubSub } = require('apollo-server-express')
const { MongoClient } = require('mongodb')
const { readFileSync } = require('fs')
const expressPlayground = require('graphql-playground-middleware-express').default
const resolvers = require('./resolvers')
const path = require('path')
const { createServer } = require('http')

require('dotenv').config()
var typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8')

async function start() {
  const app = express()
  const MONGO_DB = process.env.DB_HOST
  // PubSubインスタンス生成
  const pubsub = new PubSub()
  let db

  try {
    const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true })
    db = client.db()
  } catch (error) {
    console.log(`
    
      Mongo DB Host not found!
      please add DB_HOST environment variable to .env file

      exiting...
       
    `)
    process.exit(1)
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: { version: '1.7.25' },
    context: async ({ req, connection }) => {
      const githubToken = req ? req.headers.authorization : connection.context.Authorization
      const currentUser = await db.collection('users').findOne({ githubToken })
      return { db, currentUser, pubsub }
    }
  })

  server.applyMiddleware({ app })

  app.get('/playground', expressPlayground({ endpoint: '/graphql' }))

  app.get('/', (req, res) => {
    let url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`
    res.end(`<a href="${url}">Sign In with Github</a>`)
  })

  app.use(
    '/img/photos',
    express.static(path.join(__dirname, 'assets', 'photos'))
  )

  const httpServer = createServer(app)
  // WebSocketを動作させるためのコード
  server.installSubscriptionHandlers(httpServer)

  httpServer.listen({ port: 4000 }, () =>
    console.log(`GraphQL Server running at http://localhost:4000${server.graphqlPath}`)
  )
}

start()