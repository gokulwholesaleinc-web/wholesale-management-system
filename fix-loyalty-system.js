// Test script to manually award loyalty points for order #6 using the correct system
const { exec } = require('child_process');

console.log('Testing loyalty points calculation for order #6:');
console.log('Order total: $135.75');
console.log('Rate: 2% (0.02)');
console.log('Expected points: 135.75 * 0.02 * 100 = 271.5 ≈ 272 points');
console.log('Points are stored as whole numbers (1 point = $0.01)');

exec('node -e "console.log(Math.round(135.75 * 0.02 * 100))"', (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Calculated points:', stdout.trim());
});
