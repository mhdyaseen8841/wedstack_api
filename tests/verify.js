// WedStack Business Logic Verification Test Suite
const assert = require('assert');

// 1. Time-to-minutes and Minutes-to-time conversion helpers
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

function minutesToTime(mins) {
  const totalMins = (mins + 1440) % 1440;
  let hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  
  const paddedMins = minutes.toString().padStart(2, '0');
  const paddedHours = displayHours.toString().padStart(2, '0');
  
  return `${paddedHours}:${paddedMins} ${ampm}`;
}

// 2. Mock Heuristic Offline Quote Parser
function parseTextMock(rawText) {
  const packages = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let currentPackage = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const priceMatch = line.match(/(?:[\$£€]|rs\.?|inr)\s?(\d+[\d,]*)/i) || line.match(/(\d+[\d,]*)\s?(?:usd|inr|rs|dollars|rupees)/i);
    
    const isPackageHeader = lower.includes('package') || lower.includes('tier') || lower.includes('option') || lower.includes('collection') || 
                            (priceMatch && (lower.includes('gold') || lower.includes('silver') || lower.includes('platinum') || lower.includes('classic') || lower.includes('premium') || lower.includes('basic')));

    if (isPackageHeader || (priceMatch && !currentPackage)) {
      if (currentPackage) {
        packages.push(currentPackage);
      }
      
      let cost = 0;
      if (priceMatch) {
        cost = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      }
      
      let name = line;
      if (priceMatch) {
        name = line.replace(priceMatch[0], '').replace(/[:-]/g, '').trim();
      }
      if (!name || name.length < 3) {
        name = `Package Option ${packages.length + 1}`;
      }

      currentPackage = {
        packageName: name,
        totalCost: cost,
        deliverables: [],
        finePrint: []
      };
    } else if (currentPackage) {
      const priceMatchLine = line.match(/(?:[\$£€]|rs\.?|inr)\s?(\d+[\d,]*)/i) || line.match(/(\d+[\d,]*)\s?(?:usd|inr|rs|dollars|rupees)/i);
      
      if (lower.includes('extra') || lower.includes('additional') || lower.includes('fine print') || lower.includes('per hour') || lower.includes('charge')) {
        let unit = 'unit';
        if (lower.includes('hour')) unit = 'hour';
        else if (lower.includes('guest') || lower.includes('plate') || lower.includes('person')) unit = 'guest';
        
        let costPerUnit = 0;
        if (priceMatchLine) {
          costPerUnit = parseInt(priceMatchLine[1].replace(/,/g, ''), 10);
        }
        
        currentPackage.finePrint.push({
          item: line.replace(/[:-]/g, '').trim(),
          costPerUnit,
          unit
        });
      } else {
        currentPackage.deliverables.push(line.replace(/^[-*•\s]*/, '').trim());
      }
    }
  }

  if (currentPackage) {
    packages.push(currentPackage);
  }
  return { packages };
}

// RUN TESTS
console.log('Running WedStack Business Logic Verification tests...');

try {
  // Test 1: Time convert accuracy
  assert.strictEqual(timeToMinutes('06:00 AM'), 360);
  assert.strictEqual(timeToMinutes('12:00 PM'), 720);
  assert.strictEqual(timeToMinutes('01:30 PM'), 810);
  assert.strictEqual(timeToMinutes('12:00 AM'), 0);
  console.log('✔ Time-to-Minutes conversion calculations verify OK.');

  // Test 2: Minutes convert accuracy
  assert.strictEqual(minutesToTime(360), '06:00 AM');
  assert.strictEqual(minutesToTime(720), '12:00 PM');
  assert.strictEqual(minutesToTime(810), '01:30 PM');
  assert.strictEqual(minutesToTime(0), '12:00 AM');
  console.log('✔ Minutes-to-Time formatting verification verify OK.');

  // Test 3: Shift delay simulation
  const originalTime = '08:00 AM';
  const shiftedMins = timeToMinutes(originalTime) + 45; // Delay by 45 minutes
  assert.strictEqual(minutesToTime(shiftedMins), '08:45 AM');
  console.log('✔ Cascading shift simulation (45 minutes delay) verify OK.');

  // Test 4: Offline NLP text quote parsing regex checks
  const mockQuoteText = `Gold Photography Package: $3500\n- 8 Hours Coverage\n- Digital Delivery\nFine Print: Extra hours charged at $200 per hour`;
  const result = parseTextMock(mockQuoteText);
  
  assert.strictEqual(result.packages.length, 1);
  assert.strictEqual(result.packages[0].totalCost, 3500);
  assert.strictEqual(result.packages[0].finePrint[0].costPerUnit, 200);
  assert.strictEqual(result.packages[0].finePrint[0].unit, 'hour');
  console.log('✔ Heuristic NLP Quote text parser verification verify OK.');

  console.log('\nALL BUSINESS LOGIC VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
} catch (err) {
  console.error('FAIL:', err);
  process.exit(1);
}
