import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: synthesis, error: synthesisError },
    { data: reactions },
    { data: materials },
    { data: steps }
  ] = await Promise.all([
    supabase
      .from('syntheses')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('synthesis_reactions')
      .select('*')
      .eq('synthesis_id', id)
      .order('order_index'),
    supabase
      .from('synthesis_starting_materials')
      .select('*')
      .eq('synthesis_id', id),
    supabase
      .from('synthesis_steps')
      .select('*')
      .eq('synthesis_id', id)
      .order('step_number')
  ])

  if (synthesisError || !synthesis) {
    return NextResponse.json({ error: 'Synthesis not found' }, { status: 404 })
  }

  // Generate HTML content for PDF
  const html = generatePDFHTML(synthesis, reactions || [], materials || [], steps || [])

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

function generatePDFHTML(
  synthesis: any,
  reactions: any[],
  materials: any[],
  steps: any[]
): string {
  const safetyWarningsHTML = synthesis.safety_notes ? `
    <div class="safety-box">
      <div class="safety-title">⚠ SAFETY WARNING</div>
      <div class="safety-text">${escapeHtml(synthesis.safety_notes)}</div>
    </div>
  ` : ''

  const reactionsHTML = reactions.length > 0 ? `
    <div class="section">
      <h2>Reaction Equations</h2>
      ${reactions.map(r => `
        <div class="reaction-box">
          <div class="reaction-equation">${escapeHtml(r.reaction_equation)}</div>
          <div class="reaction-details">
            ${r.reaction_type ? `<span><strong>Type:</strong> ${escapeHtml(r.reaction_type)}</span>` : ''}
            ${r.temperature ? `<span><strong>Temp:</strong> ${escapeHtml(r.temperature)}</span>` : ''}
            ${r.duration ? `<span><strong>Duration:</strong> ${escapeHtml(r.duration)}</span>` : ''}
            ${r.catalyst ? `<span><strong>Catalyst:</strong> ${escapeHtml(r.catalyst)}</span>` : ''}
            ${r.solvent ? `<span><strong>Solvent:</strong> ${escapeHtml(r.solvent)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  ` : ''

  const materialsHTML = materials.length > 0 ? `
    <div class="section">
      <h2>Starting Materials</h2>
      <table class="materials-table">
        <thead>
          <tr>
            <th>Chemical</th>
            <th>Formula</th>
            <th>Amount</th>
            <th>Purity</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          ${materials.map(m => `
            <tr>
              <td>${escapeHtml(m.chemical_name)}</td>
              <td class="formula">${escapeHtml(m.formula || '-')}</td>
              <td>${escapeHtml(m.amount || '-')}</td>
              <td>${escapeHtml(m.purity || '-')}</td>
              <td>${escapeHtml(m.state || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  const stepsHTML = steps.length > 0 ? `
    <div class="section page-break">
      <h2>Step-by-Step Procedure</h2>
      ${steps.map(s => `
        <div class="step">
          <div class="step-header">
            <span class="step-number">${s.step_number}</span>
            <span class="step-title">${escapeHtml(s.title || `Step ${s.step_number}`)}</span>
          </div>
          <p class="step-description">${escapeHtml(s.description)}</p>
          ${(s.duration || s.temperature) ? `
            <div class="step-meta">
              ${s.duration ? `<span><strong>Duration:</strong> ${escapeHtml(s.duration)}</span>` : ''}
              ${s.temperature ? `<span><strong>Temperature:</strong> ${escapeHtml(s.temperature)}</span>` : ''}
            </div>
          ` : ''}
          ${s.equipment && s.equipment.length > 0 ? `
            <div class="equipment-list">
              <strong>Equipment:</strong>
              ${s.equipment.map((eq: string) => `<span class="equipment-tag">${escapeHtml(eq)}</span>`).join('')}
            </div>
          ` : ''}
          ${s.safety_warnings && s.safety_warnings.length > 0 ? `
            <div class="step-warning">
              <strong>⚠ Warning:</strong> ${s.safety_warnings.map((w: string) => escapeHtml(w)).join(' • ')}
            </div>
          ` : ''}
          ${s.tips ? `
            <div class="step-tip">
              <strong>💡 Tip:</strong> ${escapeHtml(s.tips)}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''

  const notesHTML = synthesis.notes ? `
    <div class="notes-box">
      <h3>Additional Notes</h3>
      <p>${escapeHtml(synthesis.notes)}</p>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(synthesis.name)} - Synthesis Protocol</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      border-bottom: 3px solid #0891b2;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    
    .title {
      font-size: 28pt;
      font-weight: 700;
      color: #0891b2;
      margin-bottom: 8px;
    }
    
    .formula {
      font-family: 'Courier New', monospace;
      font-size: 14pt;
      color: #555;
      margin-bottom: 15px;
    }
    
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 15px;
    }
    
    .meta-item {
      font-size: 10pt;
    }
    
    .meta-label {
      color: #666;
    }
    
    .meta-value {
      font-weight: 600;
      color: #333;
    }
    
    .safety-box {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
    }
    
    .safety-title {
      font-size: 13pt;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
    }
    
    .safety-text {
      color: #92400e;
      font-size: 10pt;
    }
    
    .section {
      margin-top: 30px;
      margin-bottom: 20px;
    }
    
    .section h2 {
      font-size: 16pt;
      font-weight: 700;
      color: #0891b2;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e5e5;
    }
    
    .reaction-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
    }
    
    .reaction-equation {
      font-family: 'Courier New', monospace;
      font-size: 12pt;
      text-align: center;
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .reaction-details {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 9pt;
      color: #666;
    }
    
    .materials-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10pt;
    }
    
    .materials-table th {
      background: #f1f5f9;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    
    .materials-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
    }
    
    .materials-table tr:nth-child(even) {
      background: #fafafa;
    }
    
    .step {
      margin-bottom: 25px;
      padding-left: 15px;
      border-left: 4px solid #0891b2;
    }
    
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    
    .step-number {
      background: #0891b2;
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12pt;
    }
    
    .step-title {
      font-size: 13pt;
      font-weight: 600;
      color: #333;
    }
    
    .step-description {
      font-size: 10pt;
      line-height: 1.6;
      margin-bottom: 10px;
      color: #444;
    }
    
    .step-meta {
      display: flex;
      gap: 20px;
      font-size: 9pt;
      color: #666;
      margin-bottom: 10px;
    }
    
    .equipment-list {
      font-size: 9pt;
      margin-bottom: 10px;
    }
    
    .equipment-tag {
      display: inline-block;
      background: #e2e8f0;
      border-radius: 4px;
      padding: 2px 8px;
      margin: 2px 4px 2px 0;
      font-size: 8pt;
    }
    
    .step-warning {
      background: #fee2e2;
      border-radius: 6px;
      padding: 10px;
      font-size: 9pt;
      color: #991b1b;
      margin-top: 8px;
    }
    
    .step-tip {
      background: #dbeafe;
      border-radius: 6px;
      padding: 10px;
      font-size: 9pt;
      color: #1e40af;
      margin-top: 8px;
    }
    
    .notes-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      margin-top: 25px;
    }
    
    .notes-box h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    
    .notes-box p {
      font-size: 10pt;
      color: #666;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 9pt;
      color: #999;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0891b2;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .print-button:hover {
      background: #0e7490;
    }
    
    @media print {
      .print-button {
        display: none !important;
      }
      
      body {
        padding: 20px;
      }
      
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect width="12" height="8" x="6" y="14"></rect>
    </svg>
    Print / Save PDF
  </button>

  <div class="header">
    <div class="title">${escapeHtml(synthesis.name)}</div>
    ${synthesis.formula ? `<div class="formula">${escapeHtml(synthesis.formula)}</div>` : ''}
    <div class="meta-row">
      ${synthesis.category ? `<div class="meta-item"><span class="meta-label">Category: </span><span class="meta-value">${escapeHtml(synthesis.category.name)}</span></div>` : ''}
      ${synthesis.difficulty ? `<div class="meta-item"><span class="meta-label">Difficulty: </span><span class="meta-value">${escapeHtml(synthesis.difficulty)}</span></div>` : ''}
      ${synthesis.yield_percentage ? `<div class="meta-item"><span class="meta-label">Yield: </span><span class="meta-value">${synthesis.yield_percentage}%</span></div>` : ''}
      ${synthesis.total_time ? `<div class="meta-item"><span class="meta-label">Time: </span><span class="meta-value">${escapeHtml(synthesis.total_time)}</span></div>` : ''}
      ${synthesis.cas_number ? `<div class="meta-item"><span class="meta-label">CAS: </span><span class="meta-value">${escapeHtml(synthesis.cas_number)}</span></div>` : ''}
      ${synthesis.molecular_weight ? `<div class="meta-item"><span class="meta-label">MW: </span><span class="meta-value">${synthesis.molecular_weight} g/mol</span></div>` : ''}
    </div>
  </div>

  ${safetyWarningsHTML}
  ${reactionsHTML}
  ${materialsHTML}
  ${stepsHTML}
  ${notesHTML}

  <div class="footer">
    Generated by ChemSynth Pro &bull; ${new Date().toLocaleDateString()} &bull; For research and educational purposes only
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
