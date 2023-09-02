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

  public async complete(prompt: string) {
    const response = await this.getInstance().createCompletion({
      model: 'text-davinci-003',
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    if (!response.data.choices[0].text) return null;
    return response.data.choices[0].text;
  }
}
const AI = new OpenAI();
export default AI;
