
# Multi-channel bot

NodeJS app that can be configured currently as a Facebook Messenger and Skype webhook.


It accepts user text from Facebook or Skype and based on config will pass this text to either LUIS or Api.ai in order to collect product and city parameters. Once these params are passed back to the NodeJS app, the NodeJS app will offer a menu back to the user.

In the case of Facebook this will be a Facebook 'carousel', and in Skype it will be a simple numeric menu.

User then makes a choice and will be displayed a coupon for the product.


# Architecture
[architecture.pdf](doc/Arch.pdf)


# NLP Services


## IBM Watson ('Conversation' service) 
- Confusing non intuitive interface
- No in built entities e.g. cities
- Bad support - very hard to get hold of anyone tecnical. Difficult to work out difference between Conversation and Dialog services
- Seems experimental
- Seems to be tied to IBM Bluemix cloud services
- **Not used currently in the app**


## Microsoft LUIS (Better)
- Slightly better
- Has some support for know entities e.g. geographical locations
- Bad Support
- Interface seems a bit too simple and had problems with synonyms and editing an existing agent.
- Agent seems to be tied to Microsoft Azure clouds services.

## Api.ai (Best)
- Sophisticated features.
- Really nice interface.
- Easy to train - has two modes Template and Example (Example is very easy to use)
- Good support
- In built entities e.g. cities
- Good support for synonyms e.g. Restaurant/diner/bar/pub
- Nice 'prompt' facility to prompt users for required params, which helps to collect info from the conversation.
- NLP agent can be hosted on private servers under the 'higher' plan.

Summary - text is passed to api.ai service (at api.ai servers currently). Eventually api.ai's JSON response will give us an indication
(in the returned JSON ) that we have taken the required data from the chat conversation and can do a particular action at that point 

e.g. actionIncomplete:false    and action:"getProductsByLocation"  see below...

```{
  "id": "8b001ae0-1c78-4a39-b5b7-cd5c0e8bbb50",
  "timestamp": "2016-07-13T20:06:01.356Z",
  "result": {
    "source": "agent",
    "resolvedQuery": "I’m looking for restaurants in New York",
    "action": "getProductsByLocation",
    "actionIncomplete": false,
    "parameters": {
      "geo-city-us": "New York",
      "product": "restaurant",
      "product-original": "restaurants"
    },
    "contexts": [],
    "metadata": {
      "intentId": "6c0a8ecb-6a02-426e-a65e-06188e76911a",
      "webhookUsed": "false",
      "intentName": "input"
    },
    "fulfillment": {
      "speech": "One moment while we search for restaurants in New York..."
    },
    "score": 0.9997910812432783
  },
  "status": {
    "code": 200,
    "errorType": "success"
  },
  "sessionId": "157035c4-8a35-478a-8ac5-78e80128945e"
}```





# Configuration
Choose the nlp service to use by setting the process.env.NLP_SERVICE variable to "API_AI" or "LUIS" - (defaults to API_AI)

## Api.ai configuration
TODO

## LUIS configuration
TODO

## Skype bot configuration
TODO

## Facebook Messenger platform configuration
TODO

# Agent data exports

.. in nlp-config Folder
This can be imported into another LUIS or Api.ai account.




## Deploy with Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
