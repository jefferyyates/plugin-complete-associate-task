// not calling from Flex, so no token?
//const TokenValidator = require("twilio-flex-token-validator").functionValidator;

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  const response = new Twilio.Response();
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  // Only looking for Worker Activity Updates
  if(event.EventType != "worker.activity.update") callback(null, response);

  // Grab the activity's definition
  const newActivity = await client.taskrouter
    .v1
    .workspaces(context.TWILIO_WORKSPACE_SID)
    .activities(event.WorkerActivitySid)
    .fetch();

  if(!newActivity.available) {
    // If the new Activity results in the user/agent being NOT available...

    // Find all the tasks that are assigned to someone 
    // (inefficient but I didn't see a better approach)
    const taskList = await client.taskrouter
      .v1
      .workspaces(context.TWILIO_WORKSPACE_SID)
      .tasks
      .list({ assignmentStatus: "assigned" });

    // Loop thru the returned list
    for(let i = 0; i < taskList.length; i++) {

      // Find the accepted reservation.
      // If there is NOT an accepted reservation for this worker
      // move on, this is not the task we're looking for.
      const resList = await client.taskrouter
        .v1
        .workspaces(context.TWILIO_WORKSPACE_SID)
        .tasks(taskList[i].sid)
        .reservations
        .list({workerSid: event.WorkerSid, reservationStatus: "accepted"});

      if(resList.lenght == 0) continue;

      let sourceTaskAttributes = JSON.parse(taskList[i].attributes);
      let transferTargetType = "queue";
      let transferTargetSid = taskList[i].taskQueueSid; // queue sid
      let transferQueueName = taskList[i].taskQueueFriendlyName; // queue name from sid above
      let taskRouterChannel = taskList[i].taskChannelUniqueName;

      let flexInteractionSid = sourceTaskAttributes.flexInteractionSid;
      let flexInteractionChannelSid = sourceTaskAttributes.flexInteractionChannelSid;

      try {
        // Find interaction participants, we want the agent.
        let flexInteractionParticipants = await client.flexApi 
          .v1
          .interaction(flexInteractionSid)
          .channels(flexInteractionChannelSid)
          .participants
          .list();

        let flexInteractionParticipantSid = flexInteractionParticipants.find(p => p.type === 'agent').sid;

        // Remove agent from conversation but leave the conversation/interaction active
        await client.flexApi.v1
          .interaction(flexInteractionSid)
          .channels(flexInteractionChannelSid)
          .participants(flexInteractionParticipantSid)
          .update({ status: "closed" });

        // Setup new values/objects for the transfer operation
        let newTaskAttributes = {
          ...sourceTaskAttributes,
          transferTargetSid: transferTargetSid,
          transferQueueName: transferQueueName,
          transferTargetType: transferTargetType,
          ignoreWorkerContactUri: "ignoreThisParam"
        };

        let routingParams = {
          properties: {
            task_channel_unique_name: taskRouterChannel,
            workspace_sid: context.TWILIO_WORKSPACE_SID,
            workflow_sid: context.TWILIO_FLEX_CHAT_TRANSFER_WORKFLOW_SID,
            attributes: newTaskAttributes
          }
        };

        // Do the transfer, using the Interaction.
        const participantInvite = await client.flexApi.v1
          .interaction(flexInteractionSid)
          .channels(flexInteractionChannelSid)
          .invites.create({
            routing: routingParams,
          });
          
      } catch (error) {
        console.error("Error in autoTransferTasks function:", error);
      }      

    }
  }

  callback(null,response);
};
