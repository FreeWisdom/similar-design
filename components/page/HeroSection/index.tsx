import { useUser } from "@/hooks/use-user";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface HeroSectionProps {
    scrollToForm: () => void;
    hasTriedFree: boolean;
}

const HeroSection = (props: HeroSectionProps) => {
    const router = useRouter();
    const { user, loading } = useUser();

    const { scrollToForm, hasTriedFree } = props;

    return (
        <section className="relative py-20 lg:py-32 bg-gradient-to-b from-muted/20 to-background">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="container px-4 md:px-6 relative">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-primary/10 text-primary mb-4">
                            <span className="mr-2">🇨🇳</span>
                            AI-Powered Chinese Name Generation
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                            Discover Your Perfect
                            <br />
                            <span className="text-primary">Chinese Name</span>
                        </h1>

                        <p className="mt-6 text-xl text-muted-foreground md:text-2xl max-w-3xl mx-auto">
                            Create your authentic Chinese identity with our advanced AI that understands cultural significance, personal meaning, and traditional naming conventions.
                        </p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <button
                                onClick={scrollToForm}
                                className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-lg"
                            >
                                {loading ? 'Loading...' : !user ? (hasTriedFree ? '🔒 Sign In for More' : '🎁 Generate Free Name') : '🎯 Generate Name'}
                            </button>
                            <button
                                onClick={() => {
                                    router.push('/product/random-generator');
                                }}
                                className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium border border-border text-foreground hover:bg-muted rounded-md transition-colors"
                            >
                                Random Name Generator
                            </button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {loading ? 'Loading...' : !user ? '3 free names daily' : 'Unlimited generation'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Instant generation
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                Cultural accuracy
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection;