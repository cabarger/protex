interface py_include_path_and_entries
{
    PyIncludePath: string,
    Entries: string[],
}

function AddEmptyCat(S: gracie_state, ExtrDefItem: HTMLElement): void
{
    AddCat(S, ExtrDefItem, "", "", "", "", []);
}

function AddCat(S: gracie_state, ExtrDefItem: HTMLElement, Name: string, ResolvesWith: string,
    Conditions: string, MainPyModule: string, Patterns: string[]): void
{
    const CategoryFieldsContainer = document.createElement("div");
    CategoryFieldsContainer.className = "cat-fields-container";
    ExtrDefItem.appendChild(CategoryFieldsContainer);

    const CategoryFieldsItem = document.createElement("div");
    CategoryFieldsItem.className = "cat-fields-item";
    CategoryFieldsContainer.appendChild(CategoryFieldsItem);

    const CategoryNameInput = document.createElement("input");
    CategoryNameInput.className = "cat-name-input";
    CategoryNameInput.value = Name;
    CategoryFieldsItem.appendChild(CategoryNameInput);

    const ResolvesWithSelect = document.createElement("select") as HTMLSelectElement;
    ResolvesWithSelect.className = "resolves-with-select";
    const ScriptOption = document.createElement("option");
    ScriptOption.text = "script";
    ScriptOption.value = ScriptOption.text;
    ResolvesWithSelect.add(ScriptOption);
    const ConditionsOption = document.createElement("option");
    ConditionsOption.text = "conditions";
    ConditionsOption.value = ConditionsOption.text;
    ResolvesWithSelect.add(ConditionsOption);
    CategoryFieldsItem.appendChild(ResolvesWithSelect);

    const MainPyModuleSelect = document.createElement("select") as HTMLSelectElement;
    MainPyModuleSelect.className = "main-py-module-select";
    CategoryFieldsItem.appendChild(MainPyModuleSelect);

    // First selector added to document is source of truth for avaliable modules..

    let SourceOfTruthSelector = document.getElementById(
        "sot-main-py-module-select") as HTMLSelectElement | null;
    if (SourceOfTruthSelector == null)
    {
        MainPyModuleSelect.id = "sot-main-py-module-select";
        PopulatePyModuleSelectOptions(S, MainPyModuleSelect, MainPyModule);
    }
    else
    {
        // Copy selector options

        for (let SelectIndex = 0;
             SelectIndex < SourceOfTruthSelector.children.length;
             ++SelectIndex)
        {
            const PyModuleNameOption = document.createElement("option");
            MainPyModuleSelect.add(PyModuleNameOption);

            PyModuleNameOption.text =
                (SourceOfTruthSelector.children[SelectIndex] as HTMLOptionElement).text;
            PyModuleNameOption.value =
                (SourceOfTruthSelector.children[SelectIndex] as HTMLOptionElement).value;
            if (PyModuleNameOption.text === MainPyModule) // NOTE(cjb): Element needs to exist in
                                                          //   DOM before you are allowed to screw
            {                                             //   with 'selectedIndex'.
                MainPyModuleSelect.selectedIndex = SelectIndex;
            }
        }
    }

    const ConditionsInput = document.createElement("input");
    ConditionsInput.className = "conditions-input";
    ConditionsInput.value = Conditions;
    CategoryFieldsItem.appendChild(ConditionsInput);

    function UpdateResolvesWith(): void
    {
        if (ResolvesWithSelect.value === "script")
        {
            ConditionsInput.style.display = "none";
            MainPyModuleSelect.style.display = ""
        }
        else if (ResolvesWithSelect.value === "conditions")
        {
            MainPyModuleSelect.style.display = "none";
            ConditionsInput.style.display = ""
        }
        else
        {
            throw "Unknown 'ResolvesWith' value";
        }
    }
    ResolvesWithSelect.addEventListener("change", () => UpdateResolvesWith());

    // Initial resolves with value.

    for (let SelectedIndex=0;
         SelectedIndex < ResolvesWithSelect.options.length;
         ++SelectedIndex)
     {
         if (ResolvesWithSelect.options[SelectedIndex].value === ResolvesWith)
         {
             ResolvesWithSelect.selectedIndex = SelectedIndex;
             break;
         }
     }
    UpdateResolvesWith();

    const RemoveCategoryButton = document.createElement("button");
    RemoveCategoryButton.innerText = "Remove Category";
    RemoveCategoryButton.onclick = () =>
    {
        CategoryFieldsItem.remove();
    };
    CategoryFieldsItem.appendChild(RemoveCategoryButton);

    const PatternsContainer = document.createElement("div");
    PatternsContainer.className = "patterns-container";
    CategoryFieldsItem.appendChild(PatternsContainer);

    const AddPatternButton = document.createElement("button");
    AddPatternButton.innerText = "New pattern";
    AddPatternButton.onclick = () => AddPattern(S, PatternsContainer, "");
    PatternsContainer.appendChild(AddPatternButton);

    for (const P of Patterns) AddPattern(S, PatternsContainer, P);
}

interface gracie_state
{
    PyIncludePath: string; // TODO(cjb): Config file shouldn't care about this.. but it does...
    PyIncludePathEntries: string[];
};

function LastSelectedPatternInput(): HTMLInputElement | null
{
    const PatternInputs = document.getElementsByClassName("pattern-input");
    for (const Elem of PatternInputs)
    {
        if ((Elem.getAttribute("IsSelected") as string) == "true")
            return (Elem as HTMLInputElement);
    }
    return null;
}

function UpdateSelectedPattern(TargetPatternInput: HTMLInputElement): void
{
    const PrevSelectedPatternInput = LastSelectedPatternInput();
    if (PrevSelectedPatternInput != null)
    {
        PrevSelectedPatternInput.setAttribute("IsSelected", "false");
    }
    TargetPatternInput.setAttribute("IsSelected", "true");

    // Also update span text.
    const TextAreaText = (TryGetElementByID("text-area") as HTMLTextAreaElement).value;
    const SpanText = TryGetElementByID("span-text");

    const Re = RegExp(TargetPatternInput.value, "gi"); //TODO(cjb): What flags do I pass here?
    let Matches: RegExpExecArray | null;
    while ((Matches = Re.exec(TextAreaText)) !== null)
    {
        const Match = Matches[0];
        SpanText.innerHTML = TextAreaText.slice(0, Re.lastIndex - Match.length) +
                            `<span class="noice">` +
                            TextAreaText.slice(Re.lastIndex - Match.length, Re.lastIndex) +
                            `</span>` + TextAreaText.slice(Re.lastIndex);
        break; // TODO(cjb): Multi matches
    }
}

function AddPattern(S: gracie_state, PatternsContainer: HTMLElement, Pattern: string): void
{
    const PatternInput = document.createElement("input");
    PatternInput.className = "pattern-input";
    PatternInput.setAttribute("IsSelected", "false");
    PatternInput.value = Pattern;
    PatternInput.addEventListener("focus", () => UpdateSelectedPattern(PatternInput));
    PatternInput.addEventListener("input", () => UpdateSelectedPattern(PatternInput));
    PatternsContainer.appendChild(PatternInput);

    const RemovePatternButton = document.createElement("button");
    RemovePatternButton.innerText = "Remove";
    RemovePatternButton.onclick = () =>
    {
        const LSPI = LastSelectedPatternInput();
        if ((LSPI != null) &&
            (LSPI === PatternInput))
        {
            const PatternInputs = PatternsContainer.getElementsByClassName(
                "pattern-input") as HTMLCollection;
            if (PatternInputs.length - 1 > 0)
                UpdateSelectedPattern(PatternInputs.item(0) as HTMLInputElement);
        }
        PatternInput.remove();
        RemovePatternButton.remove();
    }
    PatternsContainer.appendChild(RemovePatternButton);
}

function AddExtr(S: gracie_state, ExtrName: string): HTMLElement
{
    const ExtrDefsContainer = document.getElementById("extr-defs-container");
    if (ExtrDefsContainer == null)
    {
        throw "Couldn't get div with id 'extr-defs-container'";
    }

    const ExtrDefItem = document.createElement("div");
    ExtrDefItem.className = "extr-def-item";
    ExtrDefsContainer.appendChild(ExtrDefItem);

    const NewExtrNameInput = document.createElement("input") as HTMLInputElement;
    NewExtrNameInput.className = "extr-name-input";
    NewExtrNameInput.value = ExtrName;
    ExtrDefItem.appendChild(NewExtrNameInput);

    const AddCategoryButton = document.createElement("button");
    AddCategoryButton.innerText = "New category";
    AddCategoryButton.onclick = () => AddEmptyCat(S, ExtrDefItem);
    ExtrDefItem.appendChild(AddCategoryButton);

    const RemoveExtractorButton = document.createElement("button");
    RemoveExtractorButton.innerText = "Remove Extractor";
    RemoveExtractorButton.onclick = () =>
    {
        ExtrDefItem.remove();
    };
    ExtrDefItem.appendChild(RemoveExtractorButton);

    return ExtrDefItem;
}

function PopulatePyModuleSelectOptions(S: gracie_state, Selector: HTMLSelectElement,
    SelectText: string): void
{
    Selector.innerText = "";

    const PyEntries = S.PyIncludePathEntries;
    let SelectIndex = -1;
    PyEntries.forEach((PyModule, PyModuleIndex) =>
    {
        const PyModuleNameOption = document.createElement("option");
        PyModuleNameOption.value = PyModule;
        PyModuleNameOption.text = PyModule;
        if (PyModule === SelectText)
        {
            SelectIndex = PyModuleIndex;
        }
        Selector.add(PyModuleNameOption);
    });
    Selector.selectedIndex = SelectIndex;
}

interface cat_def
{
    Name: string,
    ResolvesWith: string,
    Conditions: string,
    MainPyModule: string,
    Patterns: string[],
};

interface extr_def
{
    Name: string,
    Categories: cat_def[],
};

interface gracie_config
{
    PyIncludePath: string,
    ExtractorDefinitions: extr_def[],
};

//  Give window an ElectronAPI property so I don't have to cast it as any.

interface gracie_window extends Window
{
    ElectronAPI: any
};

const GracieWindow = window as unknown as gracie_window;

function TryGetElementByClassName(ParentElem: Element, ClassName: string,
    Index: number): HTMLElement
{
    const Elem = ParentElem.getElementsByClassName(ClassName)
        .item(Index) as HTMLElement | null;
    if (Elem == null)
    {
        throw `Couldn't get element with class: '${ClassName}' at index: '${Index}'`;
    }
    return Elem;
}

function TryGetElementByID(ElemId: string): HTMLElement
{
    const Elem = document.getElementById(ElemId);
    if (Elem == null)
    {
        throw `Couldn't get element with id: '${ElemId}'`;
    }
    return Elem;
}

function ImportJSONConfig(S: gracie_state, E: Event): void
{
    if ((E.target == null) ||
        ((E.target as HTMLElement).id != "import-config-input"))
    {
        throw "Bad event target";
    }

    // Clear out current definitions if any.
    const ExtrDefsContainer = TryGetElementByID("extr-defs-container");
    ExtrDefsContainer.innerHTML = "";

    // Get first file ( should  only be one anyway )
    const Files = ((E.target as HTMLInputElement).files as FileList);
    if (Files.length == 0)
    {
        return;
    }
    Files[0].text().then(Text =>
    {
        const JSONConfig = JSON.parse(Text);
        for (const ExtrDef of JSONConfig.ExtractorDefinitions)
        {
            const ExtrDefElem = AddExtr(S, ExtrDef.Name);
            for (const Cat of ExtrDef.Categories)
                AddCat(S, ExtrDefElem, Cat.Name, Cat.ResolvesWith, Cat.Conditions, Cat.MainPyModule,
                       Cat.Patterns);
        }
    });
}

function GenJSONConfig(S: gracie_state): string
{
    const PyIncludePath = S.PyIncludePath;
    let ExtrDefs: extr_def[] = [];
    const ExtrDefsContainer = TryGetElementByID("extr-defs-container");
    for (const ExtrDefItem of ExtrDefsContainer.children)
    {
        const NameInput = TryGetElementByClassName(
            ExtrDefItem, "extr-name-input", 0) as HTMLInputElement;

        let CatDefs: any[] = [];
        for (const CatFieldsContainer of ExtrDefItem.getElementsByClassName("cat-fields-container"))
        {
            for (const CatItem of CatFieldsContainer.children)
            {
                const CatNameInput = TryGetElementByClassName(
                    CatItem, "cat-name-input", 0) as HTMLInputElement;
                const ResolvesWithSelect = TryGetElementByClassName(
                    CatItem, "resolves-with-select", 0) as HTMLSelectElement;
                const ConditionsInput = TryGetElementByClassName(
                    CatItem, "conditions-input", 0) as HTMLInputElement;
                const MainPyModuleSelect = TryGetElementByClassName(
                    CatItem, "main-py-module-select", 0) as HTMLSelectElement;

                let Patterns: string[] = [];
                const PatternsContainer = TryGetElementByClassName(
                    CatItem, "patterns-container", 0);
                for (const Elem of PatternsContainer
                     .getElementsByClassName("pattern-input"))
                {
                    Patterns.push((Elem as HTMLInputElement).value);
                }

                if (ResolvesWithSelect.value === "script")
                {
                    CatDefs.push({
                        Name: CatNameInput.value,
                        ResolvesWith: ResolvesWithSelect.value,
                        MainPyModule: MainPyModuleSelect.value,
                        Patterns: Patterns,
                    });
                }
                else if (ResolvesWithSelect.value === "conditions")
                {
                    CatDefs.push({
                        Name: CatNameInput.value,
                        ResolvesWith: ResolvesWithSelect.value,
                        Conditions: ConditionsInput.value,
                        Patterns: Patterns,
                    });
                }
                else
                {
                    throw "Unknown 'ResolvesWith' value";
                }
            }
        }

        const NewExtrDef: extr_def = {
            Name: (NameInput as HTMLInputElement).value,
            Categories: CatDefs,
        };
        ExtrDefs.push(NewExtrDef);
    }


    return JSON.stringify({ConfName: ConfName, PyIncludePath: PyIncludePath,
        ExtractorDefinitions: ExtrDefs});
}

function EscapeRegex(Regex: string): string
{
    // NOTE(cjb): $& = whole matched string
    return Regex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function RegexCaptureAnyNum(Regex: string): string
{
    return Regex.replace(/[\d]/g, "\\d");
}

function Regexify(Str: string): string
{
    return RegexCaptureAnyNum(EscapeRegex(Str.toLowerCase()));
}

function RegexifyLiteral(Str: string): string
{
    return EscapeRegex(Str.toLowerCase());
}

const ConfName = "webs_conf.json"; //TODO(cjb): Make this a texbox

//
// Initialization
//


let S = {} as gracie_state;

GracieWindow.ElectronAPI.GetPyIncludePath()
    .then((Result: py_include_path_and_entries) =>
{
    S.PyIncludePath = Result.PyIncludePath;
    S.PyIncludePathEntries = Result.Entries.slice(0);
});

// Root container to add dom elements to.
const AContainer = document.getElementById("acontainer")
if (AContainer == null)
{
    throw "Couldn't get acontainer element";
}

const ABox = document.createElement("div");
ABox.style.width = "95vw";
ABox.style.height = "40vh";
ABox.style.maxWidth = "95vw";
ABox.style.maxHeight = "40vh";
ABox.style.margin = "10px";
ABox.style.display = "inline-block";
//ABox.style.border = "1px solid red";
ABox.style.overflow = "hidden";
AContainer.appendChild(ABox);

// Document's text area
const DEBUGText = "Prep Cooks/Cooks Starting at $25 an Hour Qualifications\n    Restaurant: 1 year (Required)\n    Work authorization (Required)\n    High school or equivalent (Preferred)\nBenefits\n\Pulled from the full job description\n\Employee discount\n\Paid time off\n\Full Job Description\nCooks\nGreat Opportunity to work at a new all-seasons resort in Northern Catskills - Wylder Windham Hotel.\nWe are looking for a dedicated, passionate, and skilled person to become a part of our pre-opening kitchen team for our Babbler's Restaurant. Our four-season resort will offer 110 hotel rooms, 1 restaurant, 1 Bakery with 20 acres of land alongside the Batavia Kill River, our family-friendly, all-season resort is filled with endless opportunities. This newly reimagined property offers banquet, wedding, and event facilities. We are looking for someone who is both willing to roll up their sleeves and work hard and has a desire to produce a first-class experience for our guests. Looking for applicants who are positive, upbeat, team-oriented, and a people person.\nWylder is an ever growing hotel brand with locations in Lake Tahoe, California and Tilghman Maryland.\nLots of room for upward growth within the company at the Wylder Windham property and Beyond.\nYoung at heart, active, ambitious individuals encouraged to apply!\nMust work weekends, nights, holidays and be flexible with schedule. Must be able to lift 50 pounds and work a physical Labor Job.\nWylder's culture & motto: \"Everyone does everything, no one is above doing anything and the words that's not my job don't exist here\". We are here to make the guest experience the best it can be. We all work as a team and help one another out from the front desk to the restaurant and housekeeping to maintenance. We are dog and family-friendly in all aspects!.\nWylder's culture & motto: \"Everyone does everything, no one is above doing anything and the words that's not my job don't exist here\". We are here to make the guest experience the best it can be. We all work as a team and help one another out from the front desk to the restaurant and housekeeping to maintenance. We are dog and family friendly in all aspects!\nCompetitive Pay- starting at $25-$26+ per hour based on experience\nJob Type: Full-time/Part-Time\nJob Type: Full-time\nPay: From $25-$26+ per hour based on experience\nBenefits:\n    Employee discount\n\    Paid time off\nSchedule:\n    10 hour shift\n\    8 hour shift\n\    Every weekend\n\    Holidays\n\    Monday to Friday\n\    Weekend availability\nEducation:\n    High school or equivalent (Preferred)\nExperience:\n    cooking: 1 year (Preferred)\nWork Location: One location\nJob Type: Full-time\nPay: $25.00 - $26.00 per hour\nBenefits:\n    Employee discount\n\    Paid time off\nPhysical setting:\n    Casual dining restaurant\nSchedule:\n    8 hour shift\n\    Day shift\n\    Holidays\n\    Monday to Friday\n\    Night shift\n\    Weekend availability\nEducation:\n    High school or equivalent (Preferred)\nExperience:\n    Restaurant: 1 year (Required)";
const TA = document.createElement("textarea");
TA.id = "text-area"; // NOTE(cjb): also working id...
TA.value = DEBUGText;
TA.style.border = "none";
TA.style.resize = "none";
TA.style.width = "100%";
TA.style.height = "100%";
TA.style.display = "none";
TA.addEventListener("blur", () => //TODO(cjb): fix me... <span> wrapping for multiple matches
{
    TA.style.display = "none";
    SpanText.style.display = "inline-block";

    const InnerText = TA.value;
    SpanText.innerHTML = InnerText;

    SpanText.innerHTML = InnerText.slice(0, TA.selectionStart) +
                        `<span class="noice">` +
                        InnerText.slice(TA.selectionStart, TA.selectionEnd) +
                        `</span>` + InnerText.slice(TA.selectionEnd);

    // NOTE(cjb): There should allways be a last selected pattern input, unless
    // there are no inputs.
    const OptLSPI = LastSelectedPatternInput();
    if (OptLSPI == null)
        return;

    const LSPI = (OptLSPI as HTMLInputElement);
    LSPI.setAttribute("SO", `${TA.selectionStart}`);
    LSPI.setAttribute("EO", `${TA.selectionEnd}`);
    LSPI.value = Regexify(InnerText.slice(TA.selectionStart, TA.selectionEnd));
});
ABox.appendChild(TA);

const SpanText = document.createElement("p");
SpanText.id = "span-text"; // working id name...
SpanText.innerText = DEBUGText;
SpanText.style.border = "none";
SpanText.style.resize = "none";
SpanText.style.width = "100%";
SpanText.style.height = "100%";
SpanText.onclick = () =>
{
    // Toggle TA selection
    SpanText.style.display = "none";
    TA.style.display = "inline-block";
    TA.focus();
}
ABox.appendChild(SpanText);

// Import existing configuration input
const ImportConfigLabel = document.createElement("label");
ImportConfigLabel.setAttribute("for", "import-config-input");
ImportConfigLabel.innerText = "Import config:";
AContainer.appendChild(ImportConfigLabel);

const ImportConfigInput = document.createElement("input");
ImportConfigInput.id = "import-config-input";
ImportConfigInput.type = "file";
ImportConfigInput.onchange = (E) => ImportJSONConfig(S, E);
AContainer.appendChild(ImportConfigInput);

const NewExtrDefFieldsContainer = document.createElement("div");
NewExtrDefFieldsContainer.id = "new-extr-def-fields-container";
AContainer.appendChild(NewExtrDefFieldsContainer);

const ExtrNameInput = document.createElement("input");
ExtrNameInput.id = "extr-name-input";
NewExtrDefFieldsContainer.appendChild(ExtrNameInput);

const AddExtrButton = document.createElement("button");
AddExtrButton.innerText = "New extractor";
AddExtrButton.onclick = () =>
{
    AddExtr(S, ExtrNameInput.value);

    // Reset inputs
    ExtrNameInput.value = "";
};
NewExtrDefFieldsContainer.appendChild(AddExtrButton);

const ExtrDefsContainer = document.createElement("div");
ExtrDefsContainer.id = "extr-defs-container";
AContainer.appendChild(ExtrDefsContainer);

const DocSectionsContainer = document.createElement("div");
DocSectionsContainer.id = "doc-sections-container";
AContainer.appendChild(DocSectionsContainer);

const DEBUGDisplayConfig = document.createElement("span");
DEBUGDisplayConfig.className = "debug-display-config";

const RunExtractor = document.createElement("button");
RunExtractor.innerText = "Run extractor";
RunExtractor.onclick = () =>
{
    const ConfigStr = GenJSONConfig(S);
    GracieWindow.ElectronAPI.WriteConfig(ConfigStr).then(() =>
    {
        GracieWindow.ElectronAPI.RunExtractor(ConfName, TA.value)
            .then((ExtractorOut: any) =>
        {
            console.log(ExtractorOut);
        });
    });
}
AContainer.appendChild(RunExtractor);

const GenConfButton = document.createElement("button");
GenConfButton.innerText = "Generate config!";
GenConfButton.onclick = () =>
{
    const JSONConfigStr = GenJSONConfig(S);
    DEBUGDisplayConfig.innerText = JSONConfigStr;
}
AContainer.appendChild(GenConfButton);
AContainer.appendChild(DEBUGDisplayConfig);
