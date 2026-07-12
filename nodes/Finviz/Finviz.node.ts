import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

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
                displayName: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                default: 'json',
                description: 'How to output the screener data',
                options: [
                    {
                        name: 'CSV (Binary File)',
                        value: 'binary',
                        description: 'The raw CSV attached as a binary file, e.g. to commit to GitHub',
                    },
                    {
                        name: 'CSV (Text)',
                        value: 'text',
                        description: 'The raw CSV as a string in a single field',
                    },
                    {
                        name: 'JSON',
                        value: 'json',
                        description: 'One item per row, with each column as a field',
                    },
                ],
            },
            {
                displayName: 'Output Field',
                name: 'outputField',
                type: 'string',
                default: 'data',
                description:
                    'Name of the field to put the CSV in. For a binary file this is the binary property name; for text it is the JSON field name.',
                displayOptions: {
                    show: {
                        outputFormat: ['binary', 'text'],
                    },
                },
            },
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: '',
                placeholder: 'e.g. screener.csv',
                description:
                    'File name for the binary CSV. Leave empty to derive it from the Screener Name (falls back to screener.csv). A .csv extension is added if missing.',
                displayOptions: {
                    show: {
                        outputFormat: ['binary'],
                    },
                },
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
                const outputFormat = this.getNodeParameter('outputFormat', i) as string;
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

                const dataLines = lines.slice(1);
                const count = returnAll ? dataLines.length : Math.min(limit, dataLines.length);

                if (outputFormat === 'binary' || outputFormat === 'text') {
                    // The raw split lines are already valid CSV, so slice them to
                    // respect the limit without re-serializing (avoids re-quoting bugs).
                    const outputCsv = [lines[0], ...dataLines.slice(0, count)].join('\n');
                    const outputField = this.getNodeParameter('outputField', i) as string;

                    if (outputFormat === 'text') {
                        returnData.push({
                            json: { 'Screener Name': screenerName, [outputField]: outputCsv },
                            pairedItem: { item: i },
                        });
                    } else {
                        const fileName = sanitizeFileName(
                            (this.getNodeParameter('fileName', i) as string) || screenerName,
                        );
                        const binaryData = await this.helpers.prepareBinaryData(
                            Buffer.from(outputCsv, 'utf8'),
                            fileName,
                            'text/csv',
                        );
                        returnData.push({
                            json: { 'Screener Name': screenerName },
                            binary: { [outputField]: binaryData },
                            pairedItem: { item: i },
                        });
                    }
                    continue;
                }

                const headers = parseCsvLine(lines[0]);

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
                    throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
                }
            }
        }

        return [returnData];
    }
}

export function sanitizeFileName(name: string): string {
    // Strip characters unsafe for file names, collapse whitespace, and trim.
    const base = (name ?? '')
        .replace(/\.csv$/i, '')
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return `${base || 'screener'}.csv`;
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