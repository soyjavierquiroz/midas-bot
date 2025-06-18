const axios = require('axios');

const YOURS_API = 'https://kuruk.in/yourls-api.php';
const YOURS_SIGNATURE = '0eb5a147eb';

exports.shortenURL = async (longUrl, customAlias = undefined) => {
  const params = new URLSearchParams({
    signature: YOURS_SIGNATURE,
    action: 'shorturl',
    format: 'json',
    url: longUrl
  });

  if (customAlias) {
    params.append('keyword', customAlias);
  }

  try {
    const response = await axios.post(YOURS_API, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'fail') {
      throw new Error(response.data.message);
    }

    return response.data.shorturl;
  } catch (error) {
    console.error('❌ Error al acortar URL:', error.message);
    throw error;
  }
};
