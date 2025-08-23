import 'dotenv/config.js'
import app from './src/app.js'
const PORT = 3000

app.listen(PORT, async () => {
  console.log(`Running on port ${PORT}`)
})
