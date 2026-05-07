import type {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    Icon,
    INodeProperties,
} from 'n8n-workflow'

export class FinvizApi implements ICredentialType {
    name = 'finvizApi';

    displayName = 'Finviz API';

    icon: Icon = 'file:../nodes/Finviz/finviz.svg';

    documentationUrl = 'https://elite.finviz.com/';

    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            qs: {
                auth: '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://elite.finviz.com',
            url: '/export',
            method: 'GET',
            qs: {
                v: '151',
                f: 'exch_nasd',
                t: 'AAPL',
            },
        },
    }
}