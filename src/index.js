const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { VoiceResponse } = require('twilio').twiml;

app.use(bodyParser.json());

app.post("/payment-complete", (req, res) => {
    console.log(req.body)
    console.log(`req-keys: ${Object.keys(req)}`)
    console.log(`params: ${JSON.stringify(req.params)}`)
    console.log(`query: ${JSON.stringify(req.query)}`)
    // const twiml = new VoiceResponse();

    // switch (event.Result) {
    //     case "success":
    //         text = "Your payment of £35.95 to pay for a parking permit was successful. Your permit will be with you in 3 to 5 working days.";
    //         break;
    //     case "payment-connector-error":
    //         text = "There was an error processing your payment. Please try again later";
    //         console.log(decodeURIComponent(event.PaymentError));
    //         break;
        
    //     default: 
    //         text = "The payment was not completed successfully";
    // }
    // twiml.say(text);

    // res.status(200).send(twiml.toString())
    res.status(204).send()
})

app.post("/status-update", (req, res) => {
    console.log(`body: ${JSON.stringify(req.body)}`)
    console.log(`req-keys: ${Object.keys(req)}`)
    console.log(`params: ${JSON.stringify(req.params)}`)
    console.log(`query: ${JSON.stringify(req.query)}`)
    res.status(204).send()
})

app.listen("8080")