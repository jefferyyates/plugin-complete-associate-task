const TokenValidator = require("twilio-flex-token-validator").functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
  const reservationSid = event.reservationSid;
  const taskSid = event.taskSid;

  const client = context.getTwilioClient();

  const response = new Twilio.Response();
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  // THIS IS INCOMPLETE I THINK
  // Need to look for either/both Interaction and Conversation
  // and complete those too.  Or maybe complete the task as well.
  try{

    let myTask = await client.taskrouter
      .v1
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks(taskSid)
      .fetch();
    
    const myConversationSid = JSON.parse(myTask.attributes).conversationSid;
    
    await client.conversations
      .v1
      .conversations(myConversationSid)
      .update({
        state: 'closed'
      });
    
    await client.taskrouter
      .v1
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks(taskSid)
      .update({
        assignmentStatus: 'completed',
        reason: 'supervisor complete action'
      });

    response.appendHeader("Content-Type", "application/json");
    // response.setBody(data);
    // Return a success response using the callback function.
    callback(null, response);
  } catch(err) {
    response.appendHeader("Content-Type", "plain/text");
    response.setBody(err.message);
    response.setStatusCode(500);
    // If there's an error, send an error response
    // Keep using the response object for CORS purposes
    callback(null, response);
  };
});
