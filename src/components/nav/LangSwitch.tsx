import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LangSwitch() {
	const { i18n } = useTranslation();

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 font-sans font-medium text-ink-muted hover:text-ink"
					>
						<Languages className="h-4 w-4" />
						<span className="uppercase">{i18n.language}</span>
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="bg-bg-raised border-line">
				<DropdownMenuItem
					onClick={() => changeLanguage("it")}
					className="font-sans text-sm focus:bg-brand/10 focus:text-brand-ink"
				>
					Italiano
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => changeLanguage("en")}
					className="font-sans text-sm focus:bg-brand/10 focus:text-brand-ink"
				>
					English
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => changeLanguage("ar")}
					className="font-sans text-sm focus:bg-brand/10 focus:text-brand-ink"
				>
					العربية
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
