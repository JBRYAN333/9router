import { NextResponse } from 'next/server';

/**
 * POST /api/classify
 * 
 * Proxy seguro de classificação de transações financeiras.
 * A chave da API (NINJA_KEY) fica no servidor, nunca no client.
 * Usa o endpoint /v1/chat/completions do 9Router para classificar.
 */
export async function POST(request) {
  try {
    const { text, plan = 'free' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Campo "text" é obrigatório' },
        { status: 400 }
      );
    }

    // Mount the 9Router internal API URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:20128';
    const model = plan === 'pro' ? 'opencode' : 'protagnix';

    const systemPrompt = `Classifique a seguinte transacao financeira. 
Retorne APENAS um JSON valido (sem markdown, sem texto extra) com:
- descricao: resumo da transacao
- valor: valor numerico (sem R$, sem simbolos)
- tipo: "entrada" ou "saida"
- categoria: Alimentacao, Transporte, Moradia, Saude, Assinaturas, Lazer, Educacao, Renda, Outros
- confianca: numero de 0 a 1

Exemplo: {"descricao":"Compra no mercado","valor":35.90,"tipo":"saida","categoria":"Alimentacao","confianca":0.95}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the API key from server context
        'Authorization': request.headers.get('authorization') || '',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('9Router API error:', response.status, errText);
      return NextResponse.json(
        { error: 'Falha na classificação via IA' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown-wrapped responses)
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Resposta da IA não contém JSON válido', raw: content },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      descricao: parsed.descricao || text,
      valor: parsed.valor || extractValue(text),
      tipo: parsed.tipo || 'saida',
      categoria: parsed.categoria || 'Outros',
      confianca: parsed.confianca || 0,
    });

  } catch (error) {
    console.error('Classify error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

function extractValue(text) {
  const match = text.match(/(\d+[.,]\d+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(',', '.'));
}
