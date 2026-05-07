import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Finviz implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Finviz',
        name: 'finviz',
        icon: 'file:finviz.svg',
        subtitle: '={{$parameter["screenerName"] || "Screener"}}',
        group: ['input'],
        version: 1,
        description: 'Fetch screener data from Finviz Elite',
        defaults: {
            name: 'Finviz',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'finvizApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Screener Name',
                name: 'screenerName',
                type: 'string',
                default: '',
                placeholder: 'e.g. S&P 500 Tech',
                description: 'A label for this screener. Added to each output item so you can tell which screener a row came from.',
            },
            {
                displayName: 'Screener URL',
                name: 'screenerUrl',
                type: 'string',
                default: '',
                placeholder: 'e.g. https://elite.finviz.com/screener?v=111&f=idx_sp500',
                description: 'Paste a Finviz screener URL from your browser. To choose which columns are returned, go to the Custom tab on the screener page, click Customize, toggle at least one column, then copy the URL — it will include a &c= parameter with your column selection.',
                required: true,
            },
            {
                displayName: 'Return All',
                name: 'returnAll',
                type: 'boolean',
                default: false,
                description: 'Whether to return all results or only up to a given limit',
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 50,
                description: 'Max number of results to return',
                typeOptions: {
                    minValue: 1,
                },
                displayOptions: {
                    show: {
                        returnAll: [false],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const screenerName = this.getNodeParameter('screenerName', i) as string;
                const screenerUrl = this.getNodeParameter('screenerUrl', i) as string;
                const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);

                const url = new URL(screenerUrl);
                const qs: Record<string, string> = {};
                url.searchParams.forEach((value, key) => {
                    qs[key] = value;
                });

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'finvizApi',
                    {
                        method: 'GET',
                        url: 'https://elite.finviz.com/export',
                        qs,
                    },
                );

                const csv = typeof response === 'string' ? response : JSON.stringify(response);
                const lines = csv.replace(/\r/g, '').split('\n').filter((line: string) => line.trim());
                if (lines.length < 2) continue;

                const headers = parseCsvLine(lines[0]);
                const dataLines = lines.slice(1);
                const count = returnAll ? dataLines.length : Math.min(limit, dataLines.length);

                for (let j = 0; j < count; j++) {
                    const values = parseCsvLine(dataLines[j]);
                    const row: Record<string, string> = {
                        'Screener Name': screenerName,
                    };
                    for (let k = 0; k < headers.length; k++) {
                        row[headers[k]] = values[k] ?? '';
                    }
                    returnData.push({ json: row, pairedItem: { item: i } });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
                } else {
                    throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
                }
            }
        }

        return [returnData];
    }
}

export function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}