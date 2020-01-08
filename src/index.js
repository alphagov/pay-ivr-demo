const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.json());

app.post("/payment", (req, res) => {
    console.log(req.body)
    res.status(204).send()
})

app.listen("8080")