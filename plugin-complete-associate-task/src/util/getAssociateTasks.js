import { manager } from "./endTask";
import { endTaskUtil } from "./endTask";

class GetAssociateTask {
  closeThisTask() {
    const selectedWorkerSid =
      manager.store.getState()?.flex?.view?.selectedWorkerInSupervisorSid || [];
    
    const selectedTaskReservationSid =
      manager.store.getState()?.flex?.view?.selectedTaskInSupervisorSid;

    const workerTasks = this.getAllTasks();

    // eslint-disable-next-line no-unused-vars
    workerTasks.forEach(function (value, key) {
      if (value.sid == selectedTaskReservationSid) {
        endTaskUtil.startEndTask(value.sid, value.taskSid);
      }
    });
  }

  loopTask() {
    const selectedWorkerSid =
      manager.store.getState()?.flex?.view?.selectedWorkerInSupervisorSid || [];

    const workerTasks = this.getWorkerTasks(selectedWorkerSid);
    // eslint-disable-next-line no-unused-vars
    workerTasks.forEach(function (value, key) {
      endTaskUtil.startEndTask(value.sid, value.taskSid);
    });
  }

  getAllTasks() {
    const workers = manager.store.getState()?.flex?.supervisor?.workers || [];
    var workerTasks = [];
    workers.forEach(function (value) {
      workerTasks = workerTasks.concat(value.tasks);
    });
    return workerTasks;
  }

  getWorkerTasks(selectedWorkerSid) {
    const workers = manager.store.getState()?.flex?.supervisor?.workers || [];
    var workerTasks;
    workers.forEach(function (value) {
      if (value.worker.sid == selectedWorkerSid) {
        workerTasks = value.tasks;
      }
    });
    return workerTasks;
  }
}

export const getAssociateTask = new GetAssociateTask();
