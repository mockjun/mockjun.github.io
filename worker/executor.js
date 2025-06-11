const createContext = () => {
  let startTime;
  const results = [];

  const start = () => {
    if (startTime) return;
    startTime = performance.now();
    self.postMessage({ type: 'start' });
  };
  const add = (title, result) => {
    if (!startTime) return;
    results.push(result);
    self.postMessage({ type: 'add', payload: { title, result }});
  };
  const update = (status) => {
    if (!startTime) return;
    self.postMessage({ type: 'update', payload: { status }});
  };
  const end = () => {
    if (!startTime) return;
    const endTime = performance.now();
    const elapsed = (endTime - startTime).toFixed(2);
    const solved = results.every(value => value);
    self.postMessage({ type: 'end', payload: { elapsed, solved }});
    self.close();
  }

  return { start, add, update, end };
};

self.onmessage = (event) => {
  if (!event.data || !event.data.problemCode) return;
  const { problemCode, answerCode } = event.data;
  const problem = new Function('context', 'answer', problemCode);
  const answer = new Function(answerCode);
  const context = createContext();
  problem(context, answer);
}