import {Configuration, OpenAIApi} from 'openai';
import {OPENAI_KEY} from '../../constants';
class OpenAI {
  private client = new OpenAIApi(
    new Configuration({
      apiKey: OPENAI_KEY,
    })
  );

  public getInstance() {
    if (!this.client) {
      this.client = new OpenAIApi(
        new Configuration({
          apiKey: OPENAI_KEY,
        })
      );
    }
    return this.client;
  }

  public complete(prompt: string) {
    const response = this.getInstance()
      .createCompletion({
        model: 'text-davinci-002',
        prompt: prompt,
        temperature: 0.7,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      })
      .then(data => {
        if (data.status === 200) {
          return data.data.choices?.[0].text;
        }
        return data;
      });
    return response;
  }
}
const AI = new OpenAI();
export default AI;
