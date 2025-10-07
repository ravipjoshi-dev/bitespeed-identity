import express from 'express'
import { identify } from './identifyController'

const router = express.Router()
router.post('/identify', identify)
export default router ;
