
# Multi-channel bot

NodeJS app that can be configured currently as a Facebook Messenger and Skype webhook.


It accepts user text from Facebook or Skype and based on config will pass this text to either LUIS or Api.ai in order to collect

product and city parameters. Once these params are passed back to the NodeJS app, the NodeJS app will offer a menu back to the user.

In the case of Facebook this will be a Facebook 'carousel', and in Skype it will be a simple numeric menu.

User then makes a choice and will be displayed a coupon for the product.



# NLP Services


## IBM Watson ('Conversation' service) 
Confusing non intuitive interface
No in built entities e.g. cities
Bad support - very hard to get hold of anyone tecnical. Difficult to work out difference between Conversation and Dialog services
Seems experimental
Not used currently ny the app


## Microsoft LUIS (Better)
Slightly better
Has some support for know entities e.g. geographical locations
Bad Support
Interface seems a bit too simple and had problems with synonyms and editing an existing agent.

## Api.ai (Best)
Sophisticated features.
Really nice interface.
Easy to train - has two modes Template and Example (Example is very easy to use)
Good support
In built entities e.g. cities
Good support for synonyms e.g. Restaurant/diner/bar/pub
Nice 'prompt' facility to prompt users for required params, which helps to collect info from the conversation.





# Configuration
Choose the nlp service to use by setting the process.env.NLP_SERVICE variable to "API_AI" or "LUIS" - (defaults to API_AI)

# Agent data exports

.. in nlp-config Folder
This can be imported into another LUIS or Api.ai account.




## Deploy with Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
