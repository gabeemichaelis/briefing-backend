import { Client } from '@notionhq/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!process.env.NOTION_API_KEY || !databaseId) {
      return res.status(500).json({ error: 'Variáveis de ambiente do Notion não configuradas.' });
    }

    const data = req.body;
    const answers = data.answers || {};

    // Montando os blocos de conteúdo detalhados para o Notion
    const childrenBlocks = [
      {
        object: 'block',
        heading_2: { rich_text: [{ text: { content: '📁 Informações de Contato e Marca' } }] }
      },
      {
        object: 'block',
        paragraph: { rich_text: [{ text: { content: `Cliente: ${data.clientName} | E-mail: ${data.clientEmail} | WhatsApp: ${data.clientPhone || 'Não informado'}` } }] }
      },
      {
        object: 'block',
        paragraph: { rich_text: [{ text: { content: `Status da Marca: ${data.brandStatus || 'Não informado'}` } }] }
      },
      {
        object: 'block',
        heading_2: { rich_text: [{ text: { content: '✨ Serviços e Respostas Específicas' } }] }
      }
    ];

    // Adiciona dinamicamente as respostas de cada serviço selecionado aos blocos
    for (const [serviceName, questionsObj] of Object.entries(answers)) {
      childrenBlocks.push({
        object: 'block',
        heading_3: { rich_text: [{ text: { content: `📌 Serviço: ${serviceName}` } }] }
      });

      for (const [question, answer] of Object.entries(questionsObj)) {
        if (answer) {
          childrenBlocks.push({
            object: 'block',
            paragraph: { rich_text: [{ text: { content: `• Q: ${question}\nR: ${answer}` } }] }
          });
        }
      }
    }

    // Informações Comerciais
    childrenBlocks.push(
      {
        object: 'block',
        heading_2: { rich_text: [{ text: { content: '💼 Informações Comerciais' } }] }
      },
      {
        object: 'block',
        paragraph: { rich_text: [{ text: { content: `Prazo desejado: ${data.deadline || 'Não informado'}\nFaixa de investimento: ${data.budget || 'Não informado'}\nOrigem do contato: ${data.source || 'Não informado'}` } }] }
      }
    );

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        "Nome da marca": {
          title: [{ text: { content: data.brandName || 'Nova Marca' } }]
        },
        "Nome do cliente": {
          rich_text: [{ text: { content: data.clientName || 'Não informado' } }]
        },
        "WhatsApp": {
          phone_number: data.clientPhone || ''
        },
        "Serviços selecionados": {
          rich_text: [{ text: { content: Array.isArray(data.services) ? data.services.join(', ') : 'Nenhum' } }]
        },
        "Data de recebimento": {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        "Prazo desejado": {
          rich_text: [{ text: { content: data.deadline || 'Não informado' } }]
        },
        "Faixa de investimento": {
          select: { name: data.budget || 'Até R$ 500' }
        },
        "Origem do contato": {
          select: { name: data.source || 'Outro' }
        }
      },
      children: childrenBlocks
    });

    return res.status(200).json({ success: true, pageId: response.id });
  } catch (error) {
    console.error('Erro na API do Notion:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao salvar no Notion' });
  }
}
