import express from 'express'
import contactRouter from './contactRouter'

const app = express()
app.use(express.json())
app.use('/', contactRouter)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
