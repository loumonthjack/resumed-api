import Service from '../../services/payment';

const Payment = {
    webhook: async (
        _: unknown,
        args: any,
        context: any
    ) => {
        const payment = await Service.webhookEvent(context.req, context.res);
        if (!payment) {
            return "failed"
        }
        return "success";
    },
};
export default Payment;