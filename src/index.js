const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const PORT = 8080

const products = require('./products')

app.use(bodyParser.urlencoded({ extended: false }))

app.use('/', products.router)

app.listen(PORT, () => console.log(`Pay IVR demo running on ${PORT}`))
