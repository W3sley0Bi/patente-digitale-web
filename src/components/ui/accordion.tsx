import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
	return (
		<AccordionPrimitive.Root
			data-slot="accordion"
			className={cn("flex w-full flex-col", className)}
			{...props}
		/>
	);
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn("border border-line rounded-md bg-bg-raised transition-shadow data-open:shadow-sm data-open:border-brand/30", className)}
			{...props}
		/>
	);
}

function AccordionTrigger({
	className,
	children,
	...props
}: AccordionPrimitive.Trigger.Props) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					"group/accordion-trigger flex flex-1 items-center justify-between px-6 py-4 text-start text-sm font-bold text-ink transition-colors outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-[--color-focus-ring] focus-visible:rounded-md disabled:pointer-events-none disabled:opacity-50",
					className,
				)}
				{...props}
			>
				{children}
				<ChevronDownIcon
					className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-300 group-data-open/accordion-trigger:rotate-180"
					aria-hidden="true"
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

function AccordionContent({
	className,
	children,
	...props
}: AccordionPrimitive.Panel.Props) {
	return (
		<AccordionPrimitive.Panel
			data-slot="accordion-content"
			className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-300 ease-out data-starting-style:h-0 data-ending-style:h-0"
			{...props}
		>
			<div className={cn("px-6 pb-4 pt-0 text-sm leading-relaxed text-ink-muted", className)}>
				{children}
			</div>
		</AccordionPrimitive.Panel>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
