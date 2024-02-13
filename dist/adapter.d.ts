import { AxiosAdapter } from 'axios';
import * as http2 from 'http2-wrapper';
export interface HTTP2AdapterConfig {
    agent?: http2.Agent;
    force?: boolean;
}
export declare function createHTTP2Adapter(adapterConfig?: Partial<HTTP2AdapterConfig>): AxiosAdapter;
