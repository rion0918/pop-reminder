// All widget event renders and application-triggered updates share this queue.
let queue: Promise<void> = Promise.resolve();

export function enqueueWidgetTask(task: () => Promise<void>): Promise<void> {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}
