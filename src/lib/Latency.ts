export class Latency {
    private timerStart: number | null = null;
    private timerStop: number | null = null;

    start(): void {
        this.timerStart = Date.now();
    }

    stop(): void {
        this.timerStop = Date.now();
    }

    difference(): number {
        if (this.timerStart === null || this.timerStop === null) return 0;
        return this.timerStop - this.timerStart;
    }
}
