
import { GoogleGenAI } from "@google/genai";

// Financial advisor service using Gemini API with Retry Logic for Vercel stability
export const getFinancialAdvice = async (amount: number, term: number, income?: number, retries = 2) => {
  if (!process.env.API_KEY) return "Hệ thống đang bảo trì dịch vụ tư vấn tài chính.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const attempt = async (remainingRetries: number): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Tôi muốn vay ${amount.toLocaleString()} VNĐ trong vòng ${term} tháng. Thu nhập của tôi là ${income ? income.toLocaleString() : 'không xác định'} VNĐ. Hãy phân tích khả năng trả nợ và đưa ra lời khuyên tài chính cực kỳ ngắn gọn (dưới 50 từ) bằng tiếng Việt.`,
        config: {
          systemInstruction: "Bạn là chuyên gia tài chính NDV Money. Trả lời chuyên nghiệp, thẳng thắn, tập trung vào rủi ro và giải pháp.",
          temperature: 0.5,
        },
      });

      return response.text || "Hiện tại chuyên gia không có lời khuyên nào cụ thể.";
    } catch (error) {
      if (remainingRetries > 0) {
        // Đợi 1 giây trước khi thử lại
        await new Promise(resolve => setTimeout(resolve, 1000));
        return attempt(remainingRetries - 1);
      }
      console.error("Gemini Failure:", error);
      return "Dịch vụ tư vấn AI tạm thời không khả dụng. Vui lòng thử lại sau.";
    }
  };

  return attempt(retries);
};
