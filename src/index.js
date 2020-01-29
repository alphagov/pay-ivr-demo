const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const { VoiceResponse } = require('twilio').twiml
const axios = require('axios')

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/receive-call', (req, res) => {
    const twiml = new VoiceResponse();
    twiml.say('Hello you have reached gove dot uk pay');
    twiml.pay({
        chargeAmount: '25.98',
        currency: 'gbp',
        timeout: '20',
        postalCode: 'false',
        description: 'payment from twilio',
        paymentConnector: 'Stripe_Connector',
        action: 'https://ivr-demo.london.cloudapps.digital/payment-complete'
    })

    res.status(200).send(twiml.toString())
})

app.post('/payment-complete', async (req, res) => {
    console.log(`payment complete body: ${JSON.stringify(req.body)}`)

    const twiml = new VoiceResponse();

    switch (req.body.Result) {
        case 'success':
            // await axios.post('http://card-connector-dev-stephen.apps.internal:8080/v1/api/ivr/create-payment', {
            //     'stripe_id': req.body.PaymentConfirmationCode
            // })

            text = 'Your payment was complete.';
            break;
        case 'payment-connector-error':
            text = 'There was an error processing your payment. Please try again later';
            console.log(req.body.PaymentError);
            break;
        
        default: 
            text = 'The payment was not completed successfully';
    }
    twiml.say(text);

    res.status(200).send(twiml.toString())
})

app.post('/status-update', (req, res) => {
    console.log(`status update body: ${JSON.stringify(req.body)}`)
    res.status(204).send()
})

app.listen('8080')