declare module 'quagga' {
  interface QuaggaConfig {
    inputStream?: {
      name: string;
      type: string;
      target: HTMLElement;
      constraints?: {
        width?: { min?: number; ideal?: number; max?: number };
        height?: { min?: number; ideal?: number; max?: number };
        facingMode?: string;
        aspectRatio?: { min?: number; max?: number };
      };
      area?: {
        top?: string;
        right?: string;
        left?: string;
        bottom?: string;
      };
      singleChannel?: boolean;
    };
    locate?: boolean;
    numOfWorkers?: number;
    decoder?: {
      readers: string[];
      debug?: {
        drawBoundingBox?: boolean;
        showFrequency?: boolean;
        drawScanline?: boolean;
        showPattern?: boolean;
      };
      multiple?: boolean;
    };
    locator?: {
      patchSize?: string;
      halfSample?: boolean;
    };
  }

  interface QuaggaResult {
    codeResult: {
      code: string;
    };
  }

  const Quagga: {
    init(config: QuaggaConfig, callback: (err?: any) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: QuaggaResult) => void): void;
  };

  export default Quagga;
}