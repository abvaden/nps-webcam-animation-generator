// R2 call tracking and classification utility
// Separates Class A (expensive) and Class B (cheaper) operations for cost monitoring

export interface R2CallMetrics {
  classA: {
    putObject: number;
    listBuckets: number;
    putBucket: number;
    copyObject: number;
    completeMultipartUpload: number;
    createMultipartUpload: number;
    lifecycleStorageTierTransition: number;
    listMultipartUploads: number;
    uploadPart: number;
    uploadPartCopy: number;
    listParts: number;
    putBucketEncryption: number;
    putBucketCors: number;
    putBucketLifecycleConfiguration: number;
  };
  classB: {
    getObject: number;
    listObjects: number;
    headBucket: number;
    headObject: number;
    usageSummary: number;
    getBucketEncryption: number;
    getBucketLocation: number;
    getBucketCors: number;
    getBucketLifecycleConfiguration: number;
  };
}

export class R2CallTracker {
  private metrics: R2CallMetrics;

  constructor(public bucket: R2Bucket) {
    this.metrics = {
      classA: {
        putObject: 0,
        listBuckets: 0,
        putBucket: 0,
        copyObject: 0,
        completeMultipartUpload: 0,
        createMultipartUpload: 0,
        lifecycleStorageTierTransition: 0,
        listMultipartUploads: 0,
        uploadPart: 0,
        uploadPartCopy: 0,
        listParts: 0,
        putBucketEncryption: 0,
        putBucketCors: 0,
        putBucketLifecycleConfiguration: 0,
      },
      classB: {
        getObject: 0,
        listObjects: 0,
        headBucket: 0,
        headObject: 0,
        usageSummary: 0,
        getBucketEncryption: 0,
        getBucketLocation: 0,
        getBucketCors: 0,
        getBucketLifecycleConfiguration: 0,
      }
    };
  }

  /**
   * Wrapper for R2 PutObject operation (Class A)
   */
  async putObject(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | null | ReadableStream,
    options?: R2PutOptions
  ): Promise<R2Object | null> {
    this.metrics.classA.putObject++;
    return await this.bucket.put(key, value, options);
  }

  /**
   * Wrapper for R2 GetObject operation (Class B)
   */
  async getObject(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null> {
    this.metrics.classB.getObject++;
    return await this.bucket.get(key, options);
  }

  /**
   * Wrapper for R2 List operation (Class B)
   */
  async listObjects(options?: R2ListOptions): Promise<R2Objects> {
    this.metrics.classB.listObjects++;
    return await this.bucket.list(options);
  }

  /**
   * Wrapper for R2 HeadObject operation (Class B)
   */
  async headObject(key: string): Promise<R2Object | null> {
    this.metrics.classB.headObject++;
    return await this.bucket.head(key);
  }

  /**
   * Get current call metrics
   */
  getMetrics(): R2CallMetrics {
    return { ...this.metrics };
  }

  /**
   * Get total Class A calls
   */
  getTotalClassACalls(): number {
    return Object.values(this.metrics.classA).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get total Class B calls
   */
  getTotalClassBCalls(): number {
    return Object.values(this.metrics.classB).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get total calls across both classes
   */
  getTotalCalls(): number {
    return this.getTotalClassACalls() + this.getTotalClassBCalls();
  }

  /**
   * Reset metrics (useful for per-run tracking)
   */
  reset(): void {
    this.metrics = {
      classA: {
        putObject: 0,
        listBuckets: 0,
        putBucket: 0,
        copyObject: 0,
        completeMultipartUpload: 0,
        createMultipartUpload: 0,
        lifecycleStorageTierTransition: 0,
        listMultipartUploads: 0,
        uploadPart: 0,
        uploadPartCopy: 0,
        listParts: 0,
        putBucketEncryption: 0,
        putBucketCors: 0,
        putBucketLifecycleConfiguration: 0,
      },
      classB: {
        getObject: 0,
        listObjects: 0,
        headBucket: 0,
        headObject: 0,
        usageSummary: 0,
        getBucketEncryption: 0,
        getBucketLocation: 0,
        getBucketCors: 0,
        getBucketLifecycleConfiguration: 0,
      }
    };
  }

  /**
   * Calculate estimated costs based on Cloudflare R2 pricing
   * Class A: $4.50 per million requests
   * Class B: $0.36 per million requests
   */
  calculateEstimatedCosts(): { classA: number; classB: number; total: number } {
    const classACost = (this.getTotalClassACalls() / 1_000_000) * 4.50;
    const classBCost = (this.getTotalClassBCalls() / 1_000_000) * 0.36;

    return {
      classA: Math.round(classACost * 10000) / 10000, // Round to 4 decimal places
      classB: Math.round(classBCost * 10000) / 10000,
      total: Math.round((classACost + classBCost) * 10000) / 10000
    };
  }
}
