const https = require('https')

const router = require('express').Router()
const axios = require('axios')
const { VoiceResponse } = require('twilio').twiml

const PRODUCTS_URL = process.env.PRODUCTS_URL || 'http://products-dev-stephen.apps.internal:8080'
const CONNECTOR_URL = process.env.CONNECTOR_URL || 'http://card-connector-dev-stephen.apps.internal:8080'
const DEFAULT_TWILIO_ACCOUNT_ID = process.env.DEFAULT_TWILIO_ACCOUNT_ID || 'AC6925d2aa8e28da97bb0d3d46c806e6fa'
const DEFAULT_GATEWAY_ACCOUNT_ID = process.env.DEFAULT_GATEWAY_ACCOUNT_ID || 205

/**
 * interface Product {
 *  name: string
 *  price: number
 *  name: string
 *  description: string
 * }
 */

// @TODO(sfount) product or gateway account maintains this relationship
const configuredTwilioAcconts = {}
configuredTwilioAcconts[DEFAULT_TWILIO_ACCOUNT_ID] = DEFAULT_GATEWAY_ACCOUNT_ID

const voiceOptions = { voice: 'Polly.Geraint' }

// required for local HTTPS access
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

function fetchProductOptions(gatewayAccountId) {
    return axios
        .get(`${PRODUCTS_URL}/v1/api/gateway-account/${gatewayAccountId}/products`, { httpsAgent })
        .then(result => result.data
            .filter((product) => product.type === 'ADHOC')
            .filter((product) => product.status === 'ACTIVE')

            // limit choices for now
            .slice(0, 9)
        )
}

function fetchProduct(productId) {
    return axios
        .get(`${PRODUCTS_URL}/v1/api/products/${productId}`, { httpsAgent })
        .then(result => result.data)
}

async function processAccount(twilioAccountId) {
    const id = configuredTwilioAcconts[twilioAccountId]
    const products = await fetchProductOptions(id)
    const response = new VoiceResponse()

    response.say(voiceOptions, 'You have reached Gove Dot Uk Pay!')

    if (products.length === 1) {
        await processPaymentRequest(products[0], response)
    } else {
        await processProductChoices(products, twilioAccountId, response)
    }
    return response
}

async function processProductChoices(products, twilioAccountId, composeResponse) {
    const response = composeResponse || new VoiceResponse()

    const gather = response.gather({
        action: '/receive-product'
    })

    products.forEach((product, i) => gather.say(voiceOptions, `Press ${i + 1} for ${product.name}`))
    response.say(voiceOptions, 'No input received, Gove Dot Uk Pay out!')
    return response
}

async function processPaymentRequest(product, composeResponse) {
    const response = composeResponse || new VoiceResponse()

    if (product.price) {
        await processPayment(product.price / 100, product.name, response)
    } else {
        await processPaymentAmount(product, response)
    }

    return response
}

async function processPaymentAmount(product, composeResponse) {
    const response = composeResponse || new VoiceResponse()

    const gather = response.gather({
        action: `/receive-payment/${product.external_id}`,
        method: 'POST'
    })
    gather.say(voiceOptions, 'Please enter the amount you will be paying,\nfollowed by the hash key')
    response.say(voiceOptions, 'No input received, Govee Dot Uk Pay out!')

    return response
}

async function processPayment(amount, description, composeResponse) {
    const response = composeResponse || new VoiceResponse()

    response.say(voiceOptions, `You are paying £${amount} for ${description}`)
    const pay = response.pay({
        chargeAmount: amount,
        currency: 'gbp',
        timeout: '20',
        postalCode: 'false',
        description: description,
        paymentConnector: 'Stripe_Connector',
        action: '/payment-complete',
        postalCode: false
    })

    const cardNumberPrompt = pay.prompt({ for: 'payment-card-number' })
    cardNumberPrompt.say(voiceOptions, 'Please enter your card number,\nfollowed by the hash key')

    const expirationDatePrompt = pay.prompt({ for: 'expiration-date' })
    expirationDatePrompt.say(voiceOptions, 'Please enter your expiration date, two digits for the month, two digits for the year,\n followed by the hash key')

    const securityCodePrompt = pay.prompt({ for: 'security-code' })
    securityCodePrompt.say(voiceOptions, 'Please enter your security code, it’s the three digits on the back of your card,\nfollowed by the hash key')

    return response
}

router.post('/receive-call', async (req, res, next) => {
    const { AccountSid } = req.body
    const response =  await processAccount(AccountSid)

    console.log(`Receive call response for AccountSid ${AccountSid}`)
    res.status(200).send(response.toString())
})

router.post('/receive-product', async (req, res, next) => {
    const { AccountSid, Digits } = req.body
    console.log('Account', AccountSid, Digits)
    const id = configuredTwilioAcconts[AccountSid]
    const products = await fetchProductOptions(id)
    const product = products[Digits - 1]

    const response = await processPaymentRequest(product)

    console.log(`Receive product selection response for AccountSid ${AccountSid}, product ${product.external_id}`)
    res.status(200).send(response.toString())
})

router.post('/receive-payment/:productId', async (req, res, next) => {
    const { productId } = req.params
    const { Digits } = req.body
    const product = await fetchProduct(productId)

    const response = await processPayment(Digits, product.name)

    console.log(`Receive payment amount selection response for product ${product.external_id}, amount ${Digits}`)
    res.status(200).send(response.toString())
})

router.post('/payment-complete', async (req, res,next) => {
    const { AccountSid, Result, PaymentConfirmationCode } = req.body
    const id = configuredTwilioAcconts[AccountSid]

    const defaultErrorResponse = 'Your payment failed to complete, no funds have been taken from your account, Gove Dot Uk Pay out!'

    const responseMap = {
        'success': 'Your payment has been completed successfully, Gove Dot Uk Pay out!',
        'invalid-card-number': 'The provided card details were incorrect, please double check these and try again, Gove Dot Uk Pay out!',
        'invalid-security-code': 'The security code used was incorrect, please double check this and try again, Gove Dot Uk Pay out!',
        'payment-connector-error': defaultErrorResponse
    }

    const responseMessage = responseMap[Result] || defaultErrorResponse
    const response = new VoiceResponse()

    response.say(voiceOptions, responseMessage)

    if (Result === 'success') {
        await axios.post(CONNECTOR_URL, {
            stripe_id: PaymentConfirmationCode,
            account_id: id
        })
    }

    console.log(`Completed payment response for AccountSid ${AccountSid}, result ${Result}`)
    res.status(200).send(response.toString())
})

module.exports.router = router