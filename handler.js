import { SkillBuilders } from 'ask-sdk-core';
import axios from 'axios';
import moment from 'moment';

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the SEPTA skill, you can say things like ask Septa to find the next Northbound Warminster train coming to Suburban Station';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Septa Skill', speechText)
      .getResponse();
  },
};

const SeptaIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SeptaIntent';
  },
  async handle(handlerInput) {
    let regionalRail = handlerInput.requestEnvelope.request.intent.slots.RegionalRail.value;
    let station = handlerInput.requestEnvelope.request.intent.slots.Station.value;
    let direction = handlerInput.requestEnvelope.request.intent.slots.Direction.value;
    let splitStations = station.split(" ");
    let theStation = '';

    splitStations.forEach(splitStation => {
      theStation += splitStation.charAt(0).toUpperCase() + splitStation.substr(1) + ' ';
    });
    direction = direction.charAt(0).toUpperCase() + direction.substr(1);

    if (!regionalRail || !theStation || !direction) {
      return handlerInput.responseBuilder
        .speak(`You need to provide a regional rail and station, something like. ask Septa
          to give me the next Doylestown train at Suburban Station
        `)
        .getResponse();
    }

    const response = await axios.get(`http://www3.septa.org/hackathon/Arrivals/${theStation.trimRight()}/30`);
    
    if (response.status == 400) {
      return handlerInput.responseBuilder
        .speak(`Hmm, sorry I cannot seem to find that station, some stations are, 30th street station, 
          suburban station, jefferson station, temple u, warminster, doylestown, university city,
          trevose, somerton, forest hills, wayne junction, jenkintown.
        `)
        .getResponse();
    }

    let arrival = response.data;
    const intDirection = direction.toLowerCase() === 'southbound' ? 1 : 0;
    let objectKey = Object.keys(arrival)[0];
    arrival = arrival[objectKey][intDirection];
    arrival = arrival[direction].find((train) => { return train.line.toLowerCase() === regionalRail});

    if (arrival) {
      return handlerInput.responseBuilder
      .speak(`The next ${regionalRail} train, coming to ${station}, scheduled for ${moment(arrival.sched_time).format('h:mm A')},
        will be arriving ${arrival.status === 'On Time' ? 'On Time' : arrival.status + ' late'},
        on track ${arrival.track}, section ${arrival.platform},
        with service type ${arrival.service_type}, headed ${arrival.direction === 'N' ? 'Northbound' : 'Southbound'},
        the destination is ${arrival.destination}, and the next station stop is ${arrival.next_station == null ? 'Not Available' : arrival.next_station}.
      `)
      .getResponse();
    }

    return handlerInput.responseBuilder
    .speak(`Could not find any ${regionalRail} train coming to ${station}`)
    .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = SkillBuilders.custom();

export const handler = skillBuilder
  .addRequestHandlers(LaunchRequestHandler, SeptaIntentHandler, HelpIntentHandler, CancelAndStopIntentHandler, SessionEndedRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();