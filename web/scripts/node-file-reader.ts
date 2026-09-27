/** GLTFExporter expects browser FileReader events when writing a GLB in Node. */
class NodeFileReader extends EventTarget {
  result: string | ArrayBuffer | null = null;
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onloadend: ((event: Event) => void) | null = null;
  readyState = 0;

  private finish(result: string | ArrayBuffer) {
    this.result = result;
    this.readyState = 2;
    const event = new Event("load");
    this.onload?.(event);
    this.dispatchEvent(event);
    const ended = new Event("loadend");
    this.onloadend?.(ended);
    this.dispatchEvent(ended);
  }

  readAsArrayBuffer(blob: Blob) {
    this.readyState = 1;
    void blob.arrayBuffer().then(
      (buffer) => this.finish(buffer),
      () => {
        const event = new Event("error");
        this.onerror?.(event);
        this.dispatchEvent(event);
      },
    );
  }

  readAsText(blob: Blob) {
    this.readyState = 1;
    void blob.text().then(
      (text) => this.finish(text),
      () => {
        const event = new Event("error");
        this.onerror?.(event);
        this.dispatchEvent(event);
      },
    );
  }
}

if (typeof globalThis.FileReader === "undefined") {
  (globalThis as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader;
}
