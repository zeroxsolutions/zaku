/** read_guide was asked for a topic it does not have; the answer lists the ones it has. */
export class UnknownTopic extends Error {
  constructor(topic: string, topics: readonly string[]) {
    super(`UnknownTopic: ${topic}; topics: ${topics.join(', ')}`);
    this.name = 'UnknownTopic';
  }
}
