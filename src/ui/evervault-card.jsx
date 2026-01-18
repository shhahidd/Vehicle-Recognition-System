import { useMotionValue } from "framer-motion";
import React, { useState, useEffect } from "react";
import { useMotionTemplate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const EvervaultCard = ({
    text,
    className,
    variant = "recognition"
}) => {
    let mouseX = useMotionValue(0);
    let mouseY = useMotionValue(0);

    const [randomString, setRandomString] = useState("");

    useEffect(() => {
        let str = generateRandomString(1500, variant);
        setRandomString(str);
    }, [variant]); // Re-run if variant changes

    function onMouseMove({ currentTarget, clientX, clientY }) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);

        const str = generateRandomString(1500, variant);
        setRandomString(str);
    }

    return (
        <div
            className={cn(
                "p-0.5  bg-transparent  flex items-center justify-center w-full h-full relative",
                className
            )}
        >
            <div
                onMouseMove={onMouseMove}
                className="group/card rounded-3xl w-full relative overflow-hidden bg-transparent flex items-center justify-center h-full"
            >
                <CardPattern
                    mouseX={mouseX}
                    mouseY={mouseY}
                    randomString={randomString}
                />
                <div className="relative z-10 flex items-center justify-center">
                    <div className="relative h-44 w-44  rounded-full flex items-center justify-center text-white font-bold text-4xl">
                        <div className="absolute w-full h-full bg-slate-900/[0.8] blur-sm rounded-full" />
                        <span className="dark:text-white text-black z-20">{text}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function CardPattern({ mouseX, mouseY, randomString }) {
    let maskImage = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`;
    let style = { maskImage, WebkitMaskImage: maskImage };

    return (
        <div className="pointer-events-none">
            <div className="absolute inset-0 rounded-2xl  [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50"></div>
            <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500 to-blue-700 opacity-0  group-hover/card:opacity-100 backdrop-blur-xl transition duration-500"
                style={style}
            />
            <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay  group-hover/card:opacity-100"
                style={style}
            >
                <p className="absolute inset-x-0 text-xs h-full break-words whitespace-pre-wrap text-white font-mono font-bold transition duration-500">
                    {randomString}
                </p>
            </motion.div>
        </div>
    );
}

const states = ["MH", "DL", "KA", "TN", "UP", "GJ", "RJ", "KL", "HR", "WB"];
const cars = ["Tata Nexon", "Mahindra Thar", "Suzuki Swift", "Hyundai Creta", "Kia Seltos", "Tata Harrier", "Mahindra XUV700", "Honda City", "Toyota Fortuner", "Tata Safari", "Maruti Brezza", "Skoda Kushaq"];
const colors = ["Pearl White", "Midnight Black", "Mystic Copper", "Galaxy Blue", "Magma Grey", "Napoli Black", "Fiery Red", "Tropical Mist", "Daytona Grey", "Orcus White"];

export const generateRandomString = (length, variant = "recognition") => {
    let result = "";
    const targetCount = Math.floor(length / 10);

    for (let i = 0; i < targetCount; i++) {
        if (variant === "detection") {
            result += `${cars[Math.floor(Math.random() * cars.length)]}  `;
        } else if (variant === "attributes") {
            result += `${colors[Math.floor(Math.random() * colors.length)]}  `;
        } else {
            // Default: recognition (Plates)
            const state = states[Math.floor(Math.random() * states.length)];
            const district = Math.floor(Math.random() * 99 + 1).toString().padStart(2, '0');
            const char1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            const series = Math.random() > 0.5 ? char1 : char1 + char2;
            const number = Math.floor(Math.random() * 9999 + 1).toString().padStart(4, '0');
            result += `${state} ${district} ${series} ${number}  `;
        }
    }
    return result;
};

export const Icon = ({ className, ...rest }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className={className}
            {...rest}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
    );
};
