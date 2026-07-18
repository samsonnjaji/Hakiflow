import { app } from './app'

const port = Number(process.env.PORT ?? 8787)
app.listen(port, '0.0.0.0', () => {
  console.log(`Katiba OS API ready at http://localhost:${port}`)
  console.log(`AI mode: ${process.env.OPENAI_API_KEY ? 'OpenAI structured analysis' : 'deterministic safe demo'}`)
})
