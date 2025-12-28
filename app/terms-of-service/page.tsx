export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold mb-8">Terms of Service for Fin AI</h1>

                <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using Fin AI ("the Service"), you agree to accept and be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use our Service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                    <p>
                        Fin AI is an intelligent personal assistant powered by advanced language models designed to help users organize their schedules, manage tasks, and retrieve information.
                        The Service is provided "as is" and acts as a tool to assist productivity.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. User Accounts and Security</h2>
                    <p>To access certain features of the Service, you may be required to register or authenticate (e.g., via Google Authentication or WhatsApp). regarding your account:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>You are responsible for maintaining the confidentiality of your account information.</li>
                        <li>You are responsible for all activities that occur under your account.</li>
                        <li>You agree to notify us immediately of any unauthorized use of your account.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
                    <p>You agree not to use the Service to:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Violate any applicable national or international laws.</li>
                        <li>Send or store material that is infringing, obscene, threatening, or otherwise unlawful or tortious.</li>
                        <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                        <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
                    <p>
                        The Service and its original content, features, and functionality are and will remain the exclusive property of Fin AI and its licensors.
                        Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Fin AI.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
                    <p>
                        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Fin AI makes no representations or warranties of any kind, express or implied, regarding the operation of the Service or the information, content, or materials included therein.
                        We do not warrant that the results obtained from the use of the Service will be accurate or reliable.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
                    <p>
                        In no event shall Fin AI, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes.
                        By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at: support@fin-ai.app
                    </p>
                </section>

                <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                    <a href="/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        &larr; Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
