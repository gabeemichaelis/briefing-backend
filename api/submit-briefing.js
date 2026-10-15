import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  // Configurações de segurança para aceitar requisições do seu site
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
    const data = req.body;

    // Criação da página estruturada no Notion
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        "Nome da marca": {
          title: [{ text: { content: data.brandName || 'Nova Marca' } }]
        },
        "Nome do cliente": {
          rich_text: [{ text: { content: data.clientName || '' } }]
        },
        "E-mail": {
          email: data.clientEmail || ''
        },
        "WhatsApp": {
          phone_number: data.clientPhone || ''
        },
        "Serviços selecionados": {
          rich_text: [{ text: { content: Array.isArray(data.services) ? data.services.join(', ') : '' } }]
        },
        "Data de recebimento": {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        "Status do projeto": {
          status: { name: 'Não iniciado' }
        },
        "Prazo desejado": {
          rich_text: [{ text: { content: data.deadline || 'Não informado' } }]
        },
        "Faixa de investimento": {
          select: { name: data.budget || 'Não informado' }
        },
        "Origem do contato": {
          select: { name: data.source || 'Outro' }
        }
      },
      children: [
        {
          object: 'block',
          heading_2: {
            rich_text: [{ text: { content: '📁 Detalhes do Briefing do Cliente' } }]
          }
        },
        {
          object: 'block',
          paragraph: {
            rich_text: [{ text: { content: `Cliente: ${data.clientName} (${data.clientEmail})` } }]
          }
        },
        {
          object: 'block',
          paragraph: {
            rich_text: [{ text: { content: `Estado atual da marca: ${data.brandState || 'Não informado'}` } }]
          }
        },
        {
          object: 'block',
          heading_3: {
            rich_text: [{ text: { content: '💬 Respostas Específicas e Observações' } }]
          }
        },
        {
          object: 'block',
          paragraph: {
            rich_text: [{ text: { content: JSON.stringify(data.answers || {}, null, 2) } }]
          }
        }
      ]
    });

    return res.status(200).json({ success: true, pageId: response.id });
  } catch (error) {
    console.error('Erro ao integrar com o Notion:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar no Notion', details: error.message });
  }
}
