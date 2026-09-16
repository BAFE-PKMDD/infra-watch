class VoiceInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batchSize = 4096;
    this.batch = new Float32Array(this.batchSize);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel?.length) return true;

    let sourceOffset = 0;
    while (sourceOffset < channel.length) {
      const copyLength = Math.min(
        channel.length - sourceOffset,
        this.batchSize - this.offset,
      );
      this.batch.set(
        channel.subarray(sourceOffset, sourceOffset + copyLength),
        this.offset,
      );
      sourceOffset += copyLength;
      this.offset += copyLength;

      if (this.offset === this.batchSize) {
        const completedBatch = this.batch;
        this.port.postMessage(completedBatch, [completedBatch.buffer]);
        this.batch = new Float32Array(this.batchSize);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("voice-input-processor", VoiceInputProcessor);
