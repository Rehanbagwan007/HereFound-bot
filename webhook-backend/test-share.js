const axios = require('axios');

async function testFetch() {
  const mid = 'aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDM1NjYxODA2MzYzOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI3NjI1MjQ0NzY2MDQwMDI4MDozMjc4MjQ0MDQyMzY0Nzk2MTMxMDk3NzQ4Mzc1Mjg2NTc5MgZDZD';
  const pageAccessToken = 'IGAAMJawo2lJpBZAGFKLXk3TmtXY21HUFVPRGt5Y3p5QjdLTVQ0ZAnVmN3pBcXdETWlKWkpKbWRlN3pkeGpscUE0RDVENDJaTVozWDZAHOF85ODJpY251QUtNeE4wLUtLemZA3QkJoejFzWUN0eW80a3ViUHJaZAFBORFBzeXZAmb3lfSQZDZD';
  
  try {
    const res = await axios.get(`https://graph.facebook.com/v17.0/${mid}`, {
      params: {
        fields: 'message,attachments,shares',
        access_token: pageAccessToken
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Error:', err.response ? err.response.data : err.message);
  }
}

testFetch();
