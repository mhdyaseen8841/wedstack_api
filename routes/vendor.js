const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');

// Get all vendors visible to user's side
router.get('/', auth, async (req, res) => {
  const { weddingId, side } = req.user;
  try {
    let query = { weddingId };

    // If Bride or Groom side, filter according to visibility rules
    if (side === 'Bride') {
      query.$or = [
        { sideVisibility: 'Bride' },
        { sideVisibility: 'Shared' },
        { sideVisibility: 'Groom', allowCrossView: true }
      ];
    } else if (side === 'Groom') {
      query.$or = [
        { sideVisibility: 'Groom' },
        { sideVisibility: 'Shared' },
        { sideVisibility: 'Bride', allowCrossView: true }
      ];
    }
    // Planners/Shared view all

    const vendors = await Vendor.find(query);
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Vendor
router.post('/', auth, async (req, res) => {
  const { weddingId, side } = req.user;
  const { vendorName, category, status, sideVisibility, allowCrossView, packages, contactNumber, instagramUrl, remarks } = req.body;
  try {
    const vendor = new Vendor({
      weddingId,
      vendorName,
      category,
      status: status || 'Discovered',
      sideVisibility: sideVisibility || side,
      allowCrossView: allowCrossView || false,
      packages: packages || [],
      contactNumber: contactNumber || '',
      instagramUrl: instagramUrl || '',
      remarks: remarks || ''
    });
    await vendor.save();
    res.status(201).json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Vendor
router.patch('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, weddingId: req.user.weddingId },
      req.body,
      { new: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Vendor
router.delete('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, weddingId: req.user.weddingId });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Intelligent AI Quote Parser
router.post('/parse-text', auth, async (req, res) => {
  const { rawText } = req.body;
  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ message: 'Text input is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      // Call Gemini API to parse the unstructured quote text
      const prompt = `
You are an expert wedding vendor quote parser. A vendor quote has been copy-pasted from WhatsApp or Instagram. Your task is to extract structured package data from it.

RULES — follow these carefully:

1. IDENTIFY SEPARATE PACKAGES:
   - When you see multiple lines of the form "Name : Price" or "Name – ₹Price" or "Name: Price" close together (e.g. "HD Makeup : 13,000" and "Airbrush Makeup : 18,000"), each one is a SEPARATE package.
   - Create one package object per such line.
   - The package name is the text before the colon/dash. The totalCost is the number after it (strip commas, currency symbols).

2. SHARED DELIVERABLES (Package Includes / What's Included):
   - If there is a bullet list (lines starting with 🔹, •, -, *, ✓ or similar) that appears AFTER the price lines or under a heading like "Package Includes" / "Includes:", treat those items as deliverables SHARED ACROSS ALL packages.
   - Add that same deliverables array to every package.
   - Strip emoji, bullets, and leading/trailing whitespace from deliverable text.

3. VARIABLE OPTIONS / FINE PRINT:
   - Lines mentioning "Additional Person", "extra hour", "travel charge", "per guest", "per plate", "per head", or any per-unit pricing go into finePrint.
   - finePrint item format: { "item": "description", "costPerUnit": Number, "unit": "person|hour|km|unit" }
   - If travel charges are "extra based on location" with no specific price, set costPerUnit to 0 and unit to "trip".
   - Add the same finePrint to every package.

4. VENDOR NAME:
   - Extract the vendor/business name from the header (often in CAPS, bold markers like *, or followed by an emoji). Return it as "vendorName".

5. CLEANING:
   - Strip all emojis, markdown bold (*), and decorative characters from names and deliverables.
   - Do not include promotional taglines (e.g. "Step into your big day...") as deliverables.
   - Do not include section headings like "Package Includes:" as a deliverable item.

Return ONLY a valid JSON object. No markdown, no explanation:
{
  "vendorName": "String",
  "packages": [
    {
      "packageName": "String (e.g. HD Makeup)",
      "totalCost": Number,
      "deliverables": ["String", ...],
      "finePrint": [
        { "item": "String", "costPerUnit": Number, "unit": "String" }
      ]
    }
  ]
}

Text to parse:
"""
${rawText}
"""
`;


      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (rawResponseText) {
        // Clean markdown block wrappers if present
        let cleanedJson = rawResponseText.trim();
        if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        
        const parsed = JSON.parse(cleanedJson);
        if (parsed && Array.isArray(parsed.packages)) {
          return res.json(parsed);
        }
      }
    } catch (err) {
      console.error('Gemini API quote parsing error, using heuristic fallback:', err);
    }
  }

  // ── Heuristic Fallback Parser: 3-strategy WhatsApp/Instagram quote parser ──
  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const clean = (s) => s
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[\u2600-\u27BF]/gu, '')
      .replace(/[🔹🔸►▸▶•◆◇★☆✓✔✨💄👑🚘➕🎊🎉🌸]/gu, '')
      .replace(/^\s*[-*•:–—|]+\s*/, '')
      .replace(/\*+/g, '')
      .trim();

    // Extract numeric price — handles Indian comma format (1,00,000) and ₹/Rs//-
    const extractPrice = (s) => {
      const m =
        s.match(/(?:total|amount|cost|price)[^\d₹]*[₹]?\s*([\d,]+)/i) ||
        s.match(/[₹$£€]\s*([\d,]+)/) ||
        s.match(/([\d,]+)\s*\/-/) ||
        s.match(/([\d,]+)\s*(?:\/?\-?\s*(?:rs|inr))?$/i);
      if (!m) return null;
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      return n > 0 ? n : null;
    };

    const isBulletLine = (line) =>
      /^[🔹🔸►▸▶•◆◇★☆✓✔➕*\-]/.test(line);

    const isFinePrintLine = (line) => {
      const l = line.toLowerCase();
      return l.includes('additional') || l.includes('travel') ||
             l.includes('extra leaf') || l.includes('extra page') ||
             l.includes('per hour') || l.includes('per person') ||
             l.includes('per guest') || l.includes('per plate') ||
             l.includes('per leaf') || l.includes('per page') ||
             (l.includes('extra') && /[\d,]{3,}/.test(line));
    };

    const isTotalLine = (line) => {
      const l = line.toLowerCase();
      return (l.includes('total') || l.includes('amount')) &&
             /[\d,]{4,}/.test(line);
    };

    // Tier words that signal a new package section
    const TIER_WORDS = ['premium', 'normal', 'basic', 'standard', 'gold',
                        'silver', 'platinum', 'budget', 'classic', 'elite',
                        'luxury', 'economy'];

    const isTierHeader = (line) => {
      const l = line.toLowerCase();
      const c = clean(line);
      if (/[\d,]{4,}/.test(line)) return false;   // skip if has a big number
      if (c.length < 2 || c.length > 55) return false;
      return TIER_WORDS.some(w => l.includes(w));
    };

    // ── PASS 0: Vendor name ────────────────────────────────────────────────────
    let vendorName = '';
    for (const line of lines) {
      const c = clean(line);
      if (c.length >= 3 && !/^\d/.test(c) && !isTotalLine(line)) {
        vendorName = c.slice(0, 60);
        break;
      }
    }

    // ── Shared fine-print collector (used across all strategies) ──────────────
    const collectFinePrint = (lineList) => {
      const fp = [];
      for (const line of lineList) {
        if (!isFinePrintLine(line)) continue;
        const price = extractPrice(line) || 0;
        const l = line.toLowerCase();
        let unit = 'unit';
        if (l.includes('hour')) unit = 'hour';
        else if (l.includes('person') || l.includes('guest') || l.includes('head')) unit = 'person';
        else if (l.includes('leaf') || l.includes('page')) unit = 'leaf';
        else if (l.includes('travel') || l.includes('km') || l.includes('location')) unit = 'trip';
        const label = clean(line);
        if (label.length > 2) fp.push({ item: label, costPerUnit: price, unit });
      }
      return fp;
    };

    let packages = [];

    // ── STRATEGY A: Inline priced lines  e.g. "HD Makeup : 13,000" ───────────
    // Detect: ≥2 lines matching "text : digits" pattern where digits > 500 and
    // line does NOT look like a total or fine-print
    const inlinePriceRx = /^(.+?)\s*[:\–\-]\s*[₹$£€]?\s*([\d,]{3,})\s*$/;
    const inlineMatches = lines.filter(line => {
      const m = line.match(inlinePriceRx);
      if (!m) return false;
      const cost = parseInt(m[2].replace(/,/g, ''), 10);
      const name = clean(m[1]).toLowerCase();
      return cost >= 500 &&
             !isTotalLine(line) &&
             !isFinePrintLine(line) &&
             !name.includes('includes') &&
             !name.includes('total') &&
             !name.includes('amount') &&
             !name.includes('travel');
    });

    if (inlineMatches.length >= 2) {
      // Collect shared deliverables from bullet blocks / "Package Includes" section
      const sharedDel = [];
      let inBlock = false;
      for (const line of lines) {
        const l = line.toLowerCase();
        if (l.includes('package includes') || (l.includes('includes') && !inlineMatches.includes(line))) {
          inBlock = true; continue;
        }
        if (inBlock && isFinePrintLine(line)) inBlock = false;
        if ((inBlock || isBulletLine(line)) && !isFinePrintLine(line) && !isTotalLine(line)) {
          const c = clean(line);
          if (c.length > 1) sharedDel.push(c);
        }
      }
      const sharedFP = collectFinePrint(lines);

      for (const line of inlineMatches) {
        const m = line.match(inlinePriceRx);
        packages.push({
          packageName: clean(m[1]),
          totalCost: parseInt(m[2].replace(/,/g, ''), 10),
          deliverables: [...sharedDel],
          finePrint: [...sharedFP]
        });
      }
    }

    // ── STRATEGY B: Named tier sections (Premium / Normal / Budget …) ─────────
    // Each tier header starts a new section; section ends at next tier or EOF
    else if (lines.some(isTierHeader)) {
      let cur = null;

      const flush = () => {
        if (cur && cur.cost > 0) packages.push({ ...cur });
        else if (cur && cur.deliverables.length > 0) packages.push({ ...cur });
        cur = null;
      };

      for (const line of lines) {
        if (isTierHeader(line)) {
          flush();
          cur = { packageName: clean(line), totalCost: 0, deliverables: [], finePrint: [] };
        } else if (cur) {
          if (isTotalLine(line)) {
            const p = extractPrice(line);
            if (p) cur.totalCost = p;
          } else if (isFinePrintLine(line)) {
            const p = extractPrice(line) || 0;
            const l = line.toLowerCase();
            let unit = 'unit';
            if (l.includes('hour')) unit = 'hour';
            else if (l.includes('person') || l.includes('guest')) unit = 'person';
            else if (l.includes('leaf') || l.includes('page')) unit = 'leaf';
            else if (l.includes('travel') || l.includes('km')) unit = 'trip';
            cur.finePrint.push({ item: clean(line), costPerUnit: p, unit });
          } else {
            const c = clean(line);
            if (c.length > 2 && !isTotalLine(line)) cur.deliverables.push(c);
          }
        }
      }
      flush();
    }

    // ── STRATEGY C: Single block  (deliverables + one TOTAL at bottom) ────────
    if (packages.length === 0) {
      const deliverables = [];
      const finePrint = collectFinePrint(lines);
      let totalCost = 0;

      for (const line of lines) {
        if (isTotalLine(line)) {
          const p = extractPrice(line);
          if (p) totalCost = p;
        } else if (!isFinePrintLine(line)) {
          const c = clean(line);
          if (c.length > 2) deliverables.push(c);
        }
      }

      packages.push({
        packageName: vendorName || 'Standard Package',
        totalCost,
        deliverables,
        finePrint
      });
    }

    return res.json({ vendorName, packages });
  } catch (err) {
    return res.status(500).json({ message: 'Fallback parser error: ' + err.message });
  }
});

module.exports = router;

