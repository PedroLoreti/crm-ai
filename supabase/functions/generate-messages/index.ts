import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  lead_id: string;
  campaign_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { lead_id, campaign_id }: RequestBody = await req.json();

    if (!lead_id || !campaign_id) {
      throw new Error('lead_id and campaign_id are required');
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, custom_values:lead_custom_values(value, custom_fields(name))')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    const customFieldsText = lead.custom_values
      ?.map((cv: any) => `${cv.custom_fields.name}: ${cv.value}`)
      .join(', ') || 'Nenhum campo personalizado';

    const systemPrompt = `Você é um assistente de vendas especializado em gerar mensagens de abordagem personalizadas.
Tom de voz: ${campaign.tone}
Contexto da oferta: ${campaign.offer_context}`;

    const userPrompt = campaign.prompt_template
      ? campaign.prompt_template
          .replace(/{{name}}/g, lead.name)
          .replace(/{{email}}/g, lead.email || '')
          .replace(/{{phone}}/g, lead.phone || '')
          .replace(/{{company}}/g, lead.company || '')
          .replace(/{{position}}/g, lead.position || '')
      : `Gere uma mensagem de abordagem personalizada para:

Nome: ${lead.name}
Empresa: ${lead.company || 'Não informado'}
Cargo: ${lead.position || 'Não informado'}
Email: ${lead.email || 'Não informado'}
Telefone: ${lead.phone || 'Não informado'}
Campos personalizados: ${customFieldsText}

A mensagem deve ser ${campaign.tone}, focada nos benefícios da nossa oferta, e incentivar o lead a responder ou agendar uma conversa.
Gere APENAS o texto da mensagem, sem saudações redundantes no início.`;

    const messages = [];
    
    const aiApiKey = Deno.env.get('AI_API_KEY');
    if (!aiApiKey) {
      throw new Error('AI_API_KEY não configurada. Configure a variável de ambiente AI_API_KEY com sua chave da API de IA (Groq, Anthropic, OpenAI ou Google).');
    }

    const aiProvider = Deno.env.get('AI_PROVIDER') || 'groq';

    for (let i = 1; i <= 3; i++) {
      let messageText = '';

      if (aiProvider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt + `\n\nGere a variação ${i} da mensagem.` },
            ],
            max_tokens: 1024,
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro na API Groq: ${error}`);
        }

        const data = await response.json();
        messageText = data.choices[0].message.content;
      } else if (aiProvider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userPrompt + `\n\nGere a variação ${i} da mensagem.`,
              },
            ],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro na API Anthropic: ${error}`);
        }

        const data = await response.json();
        messageText = data.content[0].text;
      } else if (aiProvider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt + `\n\nGere a variação ${i} da mensagem.` },
            ],
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro na API OpenAI: ${error}`);
        }

        const data = await response.json();
        messageText = data.choices[0].message.content;
      } else if (aiProvider === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${aiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n${userPrompt}\n\nGere a variação ${i} da mensagem.`
              }]
            }]
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro na API Google: ${error}`);
        }

        const data = await response.json();
        messageText = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('AI_PROVIDER inválido. Use: groq, anthropic, openai ou google');
      }

      const { data: savedMessage, error: saveError } = await supabase
        .from('generated_messages')
        .insert({
          lead_id: lead_id,
          campaign_id: campaign_id,
          message_text: messageText,
          variation_number: i,
          was_sent: false,
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving message:', saveError);
      } else {
        messages.push(savedMessage);
      }
    }

    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: lead.workspace_id,
        lead_id: lead_id,
        action: 'message_generated',
        details: {
          campaign_id,
          campaign_name: campaign.name,
          variations: 3,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        messages,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao gerar mensagens',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});